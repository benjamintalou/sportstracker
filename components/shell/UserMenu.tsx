"use client";

import { Avatar, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import { logout } from "@/app/(auth)/login/actions";
import type { Profile } from "@/lib/session";

export function UserMenu({ profile }: { profile: Profile }) {
  const name = profile.fullName ?? profile.displayName;

  return (
    <Menu position="bottom-end" width={220} withArrow>
      <Menu.Target>
        <UnstyledButton aria-label={`Compte de ${name}`} style={{ borderRadius: "50%" }}>
          <Avatar src={profile.avatarUrl} alt={name} name={name} color="initials" radius="xl" size={36} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          <Text fz="sm" fw={600} c="var(--mantine-color-text)" truncate>
            {name}
          </Text>
          Compte Garmin Connect
        </Menu.Label>
        <Menu.Divider />
        <form action={logout}>
          <Menu.Item component="button" type="submit" color="red" leftSection={<IconLogout size={16} />}>
            Se déconnecter
          </Menu.Item>
        </form>
      </Menu.Dropdown>
    </Menu>
  );
}
