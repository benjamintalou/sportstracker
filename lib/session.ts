import "server-only";
import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";
import type { MfaState } from "./garmin/sso";
import type { AccessToken, OAuth1Token } from "./garmin/tokens";

export type Profile = { displayName: string; fullName: string | null; avatarUrl: string | null };
export type Session = { oauth1: OAuth1Token; profile: Profile };

const YEAR = 60 * 60 * 24 * 365;

export const COOKIES = {
  session: { name: "gt_session", maxAge: YEAR },
  access: { name: "gt_access", maxAge: 60 * 60 },
  mfa: { name: "gt_mfa", maxAge: 60 * 10 },
} as const;

type CookieKey = keyof typeof COOKIES;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars). See .env.example.");
  return value;
}

export const cookieOptions = (maxAge: number) =>
  ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge }) as const;

export function seal(key: CookieKey, data: object) {
  return sealData(data, { password: secret(), ttl: COOKIES[key].maxAge });
}

export async function unseal<T>(value: string | undefined): Promise<T | null> {
  if (!value) return null;
  try {
    const data = await unsealData<T>(value, { password: secret() });
    return data && Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}

export const isFresh = (token: AccessToken | null): token is AccessToken => !!token && token.expiresAt > Date.now();

async function read<T>(key: CookieKey) {
  return unseal<T>((await cookies()).get(COOKIES[key].name)?.value);
}

async function write(key: CookieKey, data: object, maxAge: number = COOKIES[key].maxAge) {
  const sealed = await seal(key, data);
  // Browsers silently drop cookies over ~4 KB.
  if (sealed.length > 3900) console.warn(`[session] cookie ${COOKIES[key].name} is ${sealed.length} bytes, close to the 4 KB limit`);
  (await cookies()).set(COOKIES[key].name, sealed, cookieOptions(maxAge));
}

export const getSession = () => read<Session>("session");
export const getAccessToken = () => read<AccessToken>("access");
export const getMfaState = () => read<MfaState>("mfa");

export const saveSession = (session: Session) => write("session", session);
export const saveMfaState = (state: MfaState) => write("mfa", state);
export const saveAccessToken = (token: AccessToken) =>
  write("access", token, Math.max(60, Math.floor((token.expiresAt - Date.now()) / 1000)));

export async function clearMfaState() {
  (await cookies()).delete(COOKIES.mfa.name);
}

export async function clearSession() {
  const jar = await cookies();
  for (const { name } of Object.values(COOKIES)) jar.delete(name);
}
