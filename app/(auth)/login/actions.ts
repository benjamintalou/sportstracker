"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { GARMIN_ERROR_MESSAGES, GarminError } from "@/lib/garmin/errors";
import { fetchProfile } from "@/lib/garmin/profile";
import { signIn, verifyMfa } from "@/lib/garmin/sso";
import { exchangeAccessToken, ticketToOAuth1 } from "@/lib/garmin/tokens";
import {
  clearMfaState,
  clearSession,
  getMfaState,
  saveAccessToken,
  saveMfaState,
  saveSession,
} from "@/lib/session";

export type LoginState = { step: "credentials" | "mfa"; error?: string; email?: string };

const credentialsSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});
const mfaSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Le code contient 6 chiffres.") });

async function openSession(ticket: string) {
  const oauth1 = await ticketToOAuth1(ticket);
  const access = await exchangeAccessToken(oauth1);
  const profile = await fetchProfile(access);
  await saveSession({ oauth1, profile });
  await saveAccessToken(access);
}

function failure(step: LoginState["step"], error: unknown, email?: string): LoginState {
  if (error instanceof GarminError) {
    // Only the error code is logged: never credentials or tokens.
    console.warn(`[garmin] login failed: ${error.code}`);
    return { step, email, error: GARMIN_ERROR_MESSAGES[error.code] };
  }
  console.error("[garmin] login failed", error instanceof Error ? error.message : error);
  return { step, email, error: GARMIN_ERROR_MESSAGES.unexpected };
}

export async function authenticate(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (formData.get("step") === "mfa") return submitMfa(formData);

  const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = typeof formData.get("email") === "string" ? (formData.get("email") as string) : undefined;
  if (!parsed.success) return { step: "credentials", email, error: parsed.error.issues[0]?.message };

  try {
    const result = await signIn(parsed.data.email, parsed.data.password);
    if (result.status === "mfa") {
      await saveMfaState(result.state);
      return { step: "mfa", email };
    }
    await openSession(result.ticket);
  } catch (error) {
    return failure("credentials", error, email);
  }
  redirect("/");
}

async function submitMfa(formData: FormData): Promise<LoginState> {
  const parsed = mfaSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { step: "mfa", error: parsed.error.issues[0]?.message };

  const state = await getMfaState();
  if (!state) return { step: "credentials", error: GARMIN_ERROR_MESSAGES.mfa_expired };

  try {
    await openSession(await verifyMfa(state, parsed.data.code));
    await clearMfaState();
  } catch (error) {
    return failure("mfa", error);
  }
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
