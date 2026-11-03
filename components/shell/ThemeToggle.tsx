"use client";

import { ActionIcon, Tooltip, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const next = computed === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Passer en mode sombre" : "Passer en mode clair";

  return (
    <Tooltip label={label}>
      <ActionIcon variant="default" size="lg" radius="md" aria-label={label} onClick={() => setColorScheme(next)}>
        {/* Both icons rendered and toggled via CSS to avoid a hydration flash */}
        <IconSun size={18} stroke={1.75} className="theme-icon-light" />
        <IconMoon size={18} stroke={1.75} className="theme-icon-dark" />
      </ActionIcon>
    </Tooltip>
  );
}
