import "server-only";
import { errorFromStatus } from "./errors";

export const GARMIN_DOMAIN = "garmin.com";
export const SSO_UA = "GCM-iOS-5.7.2.1";
export const OAUTH_UA = "com.garmin.android.apps.connectmobile";

/** Minimal cookie jar: the SSO flow relies on cookies set across redirects. */
export class CookieJar {
  constructor(private cookies: Record<string, string> = {}) {}

  store(res: Response) {
    for (const raw of res.headers.getSetCookie()) {
      const [pair] = raw.split(";");
      const eq = pair?.indexOf("=") ?? -1;
      if (!pair || eq < 1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === "" || /max-age=0|expires=thu, 01 jan 1970/i.test(raw)) delete this.cookies[name];
      else this.cookies[name] = value;
    }
  }

  header() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  toJSON() {
    return this.cookies;
  }
}

/** fetch that keeps cookies across manual redirects. */
export async function fetchWithJar(jar: CookieJar, input: string, init: RequestInit = {}, maxRedirects = 5) {
  let url = input;
  let req = init;
  for (let i = 0; i <= maxRedirects; i++) {
    const headers = new Headers(req.headers);
    headers.set("User-Agent", SSO_UA);
    const cookie = jar.header();
    if (cookie) headers.set("Cookie", cookie);

    const res = await fetch(url, { ...req, headers, redirect: "manual", cache: "no-store" });
    jar.store(res);

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url).toString();
      req = { method: "GET" };
      continue;
    }
    if (!res.ok) throw errorFromStatus(res.status);
    return res;
  }
  throw errorFromStatus(310);
}
