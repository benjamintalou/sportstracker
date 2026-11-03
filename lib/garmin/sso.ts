import "server-only";
import { GarminError } from "./errors";
import { CookieJar, GARMIN_DOMAIN, fetchWithJar } from "./http";

const SSO = `https://sso.${GARMIN_DOMAIN}/sso`;
const SSO_EMBED = `${SSO}/embed`;

const EMBED_PARAMS = new URLSearchParams({ id: "gauth-widget", embedWidget: "true", gauthHost: SSO });
const SIGNIN_PARAMS = new URLSearchParams({
  id: "gauth-widget",
  embedWidget: "true",
  gauthHost: SSO_EMBED,
  service: SSO_EMBED,
  source: SSO_EMBED,
  redirectAfterAccountLoginUrl: SSO_EMBED,
  redirectAfterAccountCreationUrl: SSO_EMBED,
});
const SIGNIN_URL = `${SSO}/signin?${SIGNIN_PARAMS}`;
const MFA_URL = `${SSO}/verifyMFA/loginEnterMfaCode?${SIGNIN_PARAMS}`;

/** State carried between the password step and the MFA step. */
export type MfaState = { cookies: Record<string, string>; csrf: string };

export type LoginResult = { status: "success"; ticket: string } | { status: "mfa"; state: MfaState };

const formHeaders = { "Content-Type": "application/x-www-form-urlencoded", Referer: SIGNIN_URL, Origin: `https://sso.${GARMIN_DOMAIN}` };

function csrfOf(html: string) {
  const csrf = /name="_csrf"\s+value="([^"]+)"/.exec(html)?.[1];
  if (!csrf) throw new GarminError("blocked", "CSRF token not found");
  return csrf;
}

const titleOf = (html: string) => /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "";

function ticketOf(html: string) {
  const ticket = /embed\?ticket=([^"&]+)"/.exec(html)?.[1];
  if (!ticket) throw new GarminError("unexpected", "SSO ticket not found");
  return ticket;
}

function outcome(html: string, jar: CookieJar, failure: "invalid_credentials" | "invalid_mfa"): LoginResult {
  const title = titleOf(html);
  if (title === "Success") return { status: "success", ticket: ticketOf(html) };
  if (title.includes("MFA")) {
    if (failure === "invalid_mfa") throw new GarminError("invalid_mfa");
    return { status: "mfa", state: { cookies: jar.toJSON(), csrf: csrfOf(html) } };
  }
  if (/locked/i.test(title)) throw new GarminError("blocked", "Account locked");
  throw new GarminError(failure, `Unexpected SSO page: ${title}`);
}

/** Step 1: email + password. Returns a service ticket, or an MFA challenge. */
export async function signIn(email: string, password: string): Promise<LoginResult> {
  const jar = new CookieJar();
  await fetchWithJar(jar, `${SSO_EMBED}?${EMBED_PARAMS}`);
  const page = await fetchWithJar(jar, SIGNIN_URL, { headers: { Referer: `${SSO_EMBED}?${EMBED_PARAMS}` } });
  const csrf = csrfOf(await page.text());

  const res = await fetchWithJar(jar, SIGNIN_URL, {
    method: "POST",
    headers: formHeaders,
    body: new URLSearchParams({ username: email, password, embed: "true", _csrf: csrf }),
  });
  return outcome(await res.text(), jar, "invalid_credentials");
}

/** Step 2: the 6-digit code sent by Garmin. */
export async function verifyMfa(state: MfaState, code: string): Promise<string> {
  const jar = new CookieJar({ ...state.cookies });
  const res = await fetchWithJar(jar, MFA_URL, {
    method: "POST",
    headers: formHeaders,
    body: new URLSearchParams({ "mfa-code": code, embed: "true", _csrf: state.csrf, fromPage: "setupEnterMfaCode" }),
  });
  const result = outcome(await res.text(), jar, "invalid_mfa");
  if (result.status !== "success") throw new GarminError("invalid_mfa");
  return result.ticket;
}
