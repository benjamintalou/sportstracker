"use client";

import { Alert, Anchor, Button, PasswordInput, PinInput, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertCircle, IconShieldLock } from "@tabler/icons-react";
import { useActionState } from "react";
import { authenticate, type LoginState } from "./actions";

const INITIAL: LoginState = { step: "credentials" };

export function LoginForm() {
  const [state, action, pending] = useActionState(authenticate, INITIAL);

  return (
    <form action={action}>
      <input type="hidden" name="step" value={state.step} />
      <Stack gap="md">
        {state.error && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
            {state.error}
          </Alert>
        )}

        {state.step === "credentials" ? (
          <>
            <TextInput
              name="email"
              label="E-mail Garmin"
              type="email"
              autoComplete="username"
              defaultValue={state.email}
              required
              autoFocus
            />
            <PasswordInput name="password" label="Mot de passe" autoComplete="current-password" required />
          </>
        ) : (
          <Stack gap="xs" align="center">
            <IconShieldLock size={36} stroke={1.5} color="var(--mantine-primary-color-filled)" />
            <Text ta="center" fz="sm">
              Garmin vous a envoyé un code de vérification à 6 chiffres.
            </Text>
            <PinInput
              name="code"
              length={6}
              type="number"
              oneTimeCode
              autoFocus
              size="lg"
              aria-label="Code de vérification"
            />
          </Stack>
        )}

        <Button type="submit" size="md" fullWidth loading={pending}>
          {state.step === "credentials" ? "Se connecter" : "Vérifier"}
        </Button>

        {state.step === "mfa" && (
          <Anchor component="button" type="button" fz="sm" ta="center" onClick={() => window.location.reload()}>
            Recommencer la connexion
          </Anchor>
        )}
      </Stack>
    </form>
  );
}
