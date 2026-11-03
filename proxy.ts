import { NextResponse, type NextRequest } from "next/server";
import { GarminError } from "@/lib/garmin/errors";
import { isDemo } from "@/lib/data/demo";
import { exchangeAccessToken, type AccessToken } from "@/lib/garmin/tokens";
import { COOKIES, cookieOptions, isFresh, seal, unseal, type Session } from "@/lib/session";

const PUBLIC_PATHS = ["/login"];

/**
 * Auth gate + token refresher: every app route needs a Garmin session, and pages
 * always receive a fresh OAuth2 access token (minted from the OAuth1 token when needed).
 */
export async function proxy(request: NextRequest) {
  if (isDemo()) return NextResponse.next();
  const { pathname } = request.nextUrl;
  const session = await unseal<Session>(request.cookies.get(COOKIES.session.name)?.value);
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!session) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
  }
  if (isPublic) return NextResponse.redirect(new URL("/", request.url));

  const access = await unseal<AccessToken>(request.cookies.get(COOKIES.access.name)?.value);
  if (isFresh(access)) return NextResponse.next();

  try {
    const token = await exchangeAccessToken(session.oauth1);
    const sealed = await seal("access", token);
    // Forward the new token to this render, and persist it for the next requests.
    request.cookies.set(COOKIES.access.name, sealed);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(
      COOKIES.access.name,
      sealed,
      cookieOptions(Math.max(60, Math.floor((token.expiresAt - Date.now()) / 1000))),
    );
    return response;
  } catch (error) {
    if (error instanceof GarminError && error.code === "unauthorized") {
      const response = NextResponse.redirect(new URL("/login", request.url));
      for (const { name } of Object.values(COOKIES)) response.cookies.delete(name);
      return response;
    }
    // Transient Garmin failure: let the page render and surface the error itself.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
