import { Center, Paper, Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";
import { Logo } from "@/components/shell/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <Center mih="100dvh" p="md">
      <Paper withBorder shadow="md" p={{ base: "lg", sm: 40 }} w="100%" maw={420}>
        <Stack gap="lg">
          <Logo />
          <div>
            <Title order={1} fz={32}>
              Connexion Garmin
            </Title>
            <Text c="dimmed" fz="sm">
              Vos identifiants servent uniquement à obtenir un jeton Garmin Connect. Ils ne sont jamais stockés.
            </Text>
          </div>
          <LoginForm />
        </Stack>
      </Paper>
    </Center>
  );
}
