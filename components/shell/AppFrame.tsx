"use client";

import { AppShell, Group } from "@mantine/core";
import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function AppFrame({ children, userSlot }: { children: React.ReactNode; userSlot?: React.ReactNode }) {
  return (
    <AppShell
      header={{ height: 64 }}
      padding={{ base: "md", sm: "xl" }}
      styles={{ header: { backdropFilter: "blur(12px)", backgroundColor: "color-mix(in srgb, var(--mantine-color-body) 80%, transparent)" } }}
    >
      <AppShell.Header px={{ base: "md", sm: "xl" }}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Link href="/" aria-label="Accueil" style={{ textDecoration: "none", color: "inherit" }}>
            <Logo />
          </Link>

          <Group gap="sm" wrap="nowrap">
            <ThemeToggle />
            {userSlot}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main maw={1280} mx="auto">
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
