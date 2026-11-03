import "server-only";
import { z } from "zod";
import type { Profile } from "@/lib/session";
import { fetchWithToken } from "./client";
import type { AccessToken } from "./tokens";

const socialProfileSchema = z.object({
  displayName: z.string(),
  fullName: z.string().nullish(),
  profileImageUrlMedium: z.string().nullish(),
});

export async function fetchProfile(token: AccessToken): Promise<Profile> {
  const profile = await fetchWithToken(token, "/userprofile-service/socialProfile", socialProfileSchema);
  return {
    displayName: profile.displayName,
    fullName: profile.fullName ?? null,
    avatarUrl: profile.profileImageUrlMedium ?? null,
  };
}
