import "server-only";
import { z } from "zod";
import { GarminError, errorFromStatus } from "./errors";
import { GARMIN_DOMAIN, OAUTH_UA } from "./http";
import { getConsumer, oauth1Header } from "./oauth1";

const OAUTH_BASE = `https://connectapi.${GARMIN_DOMAIN}/oauth-service/oauth`;

/** Long-lived (~1 year) token, used to mint short-lived OAuth2 access tokens. */
export type OAuth1Token = { token: string; secret: string; mfaToken?: string };
export type AccessToken = { value: string; expiresAt: number };

export async function ticketToOAuth1(ticket: string): Promise<OAuth1Token> {
  const consumer = await getConsumer();
  const url = `${OAUTH_BASE}/preauthorized?${new URLSearchParams({
    ticket,
    "login-url": `https://sso.${GARMIN_DOMAIN}/sso/embed`,
    "accepts-mfa-tokens": "true",
  })}`;

  const res = await fetch(url, {
    headers: { "User-Agent": OAUTH_UA, Authorization: oauth1Header({ method: "GET", url, consumer }) },
    cache: "no-store",
  });
  if (!res.ok) throw errorFromStatus(res.status);

  const params = new URLSearchParams(await res.text());
  const token = params.get("oauth_token");
  const secret = params.get("oauth_token_secret");
  if (!token || !secret) throw new GarminError("unexpected", "OAuth1 token missing");
  return { token, secret, ...(params.get("mfa_token") && { mfaToken: params.get("mfa_token")! }) };
}

const oauth2Schema = z.object({ access_token: z.string(), expires_in: z.number() });

export async function exchangeAccessToken(oauth1: OAuth1Token): Promise<AccessToken> {
  const consumer = await getConsumer();
  const url = `${OAUTH_BASE}/exchange/user/2.0`;
  const body = new URLSearchParams(oauth1.mfaToken ? { mfa_token: oauth1.mfaToken } : {});

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": OAUTH_UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: oauth1Header({ method: "POST", url, consumer, body, token: { key: oauth1.token, secret: oauth1.secret } }),
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw errorFromStatus(res.status);

  const json = oauth2Schema.parse(await res.json());
  // Renew a minute early to avoid using a token that expires mid-request.
  return { value: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
}
