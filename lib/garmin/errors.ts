export type GarminErrorCode =
  | "invalid_credentials"
  | "invalid_mfa"
  | "mfa_expired"
  | "rate_limited"
  | "blocked"
  | "unauthorized"
  | "not_found"
  | "unavailable"
  | "unexpected";

export class GarminError extends Error {
  constructor(
    public readonly code: GarminErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "GarminError";
  }
}

export const GARMIN_ERROR_MESSAGES: Record<GarminErrorCode, string> = {
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  invalid_mfa: "Code de vérification incorrect.",
  mfa_expired: "La vérification a expiré, reconnectez-vous.",
  rate_limited: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
  blocked: "Garmin a bloqué la connexion automatique. Réessayez plus tard.",
  unauthorized: "Session Garmin expirée, reconnectez-vous.",
  not_found: "Élément introuvable sur Garmin Connect.",
  unavailable: "Garmin Connect est indisponible pour le moment.",
  unexpected: "Une erreur inattendue est survenue.",
};

export function errorFromStatus(status: number): GarminError {
  if (status === 401) return new GarminError("unauthorized");
  if (status === 403) return new GarminError("blocked");
  if (status === 404) return new GarminError("not_found");
  if (status === 429) return new GarminError("rate_limited");
  if (status >= 500) return new GarminError("unavailable", `HTTP ${status}`);
  return new GarminError("unexpected", `HTTP ${status}`);
}
