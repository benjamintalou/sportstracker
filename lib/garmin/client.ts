import "server-only";
import type { z } from "zod";
import { getAccessToken, getSession, isFresh, type Session } from "@/lib/session";
import { GarminError, errorFromStatus } from "./errors";
import { GARMIN_DOMAIN, SSO_UA } from "./http";
import { exchangeAccessToken, type AccessToken } from "./tokens";

const API = `https://connectapi.${GARMIN_DOMAIN}`;

export async function fetchWithToken<S extends z.ZodType>(token: AccessToken, path: string, schema: S): Promise<z.infer<S>> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token.value}`, "User-Agent": SSO_UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw errorFromStatus(res.status);

  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) throw new GarminError("unexpected", `Unexpected payload for ${path}: ${parsed.error.message}`);
  return parsed.data;
}

/**
 * Current session and a usable access token. The proxy keeps the token cookie fresh;
 * if it is still missing, one is minted for this request only (Server Components cannot set cookies).
 */
export async function getAuth(): Promise<{ session: Session; token: AccessToken }> {
  const session = await getSession();
  if (!session) throw new GarminError("unauthorized");
  const cached = await getAccessToken();
  return { session, token: isFresh(cached) ? cached : await exchangeAccessToken(session.oauth1) };
}

/** Authenticated Garmin Connect API call for the current session, retried once with a new token on 401. */
export async function garminFetch<S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> {
  const { session, token } = await getAuth();
  try {
    return await fetchWithToken(token, path, schema);
  } catch (error) {
    if (!(error instanceof GarminError && error.code === "unauthorized")) throw error;
    return fetchWithToken(await exchangeAccessToken(session.oauth1), path, schema);
  }
}
