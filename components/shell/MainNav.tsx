"use client";

import { ActionIcon, Button, Group, Tooltip } from "@mantine/core";
import { IconBed, IconBike, IconChartBar, type Icon } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "Vélo", icon: IconBike },
  { href: "/sleep", label: "Sommeil", icon: IconBed },
  { href: "/stats", label: "Statistiques", icon: IconChartBar },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** Main menu: labelled buttons from `sm`, icon buttons (with tooltip) on phones. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <Group component="nav" aria-label="Menu principal" gap={4} wrap="nowrap">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        const current = active ? ("page" as const) : undefined;
        return (
          <div key={href}>
            <Button
              component={Link}
              href={href}
              aria-current={current}
              variant={active ? "light" : "subtle"}
              color={active ? undefined : "gray"}
              leftSection={<Icon size={18} stroke={1.75} aria-hidden />}
              visibleFrom="sm"
            >
              {label}
            </Button>
            <Tooltip label={label} withArrow>
              <ActionIcon
                component={Link}
                href={href}
                aria-label={label}
                aria-current={current}
                variant={active ? "light" : "subtle"}
                color={active ? undefined : "gray"}
                size={36}
                hiddenFrom="sm"
              >
                <Icon size={20} stroke={1.75} />
              </ActionIcon>
            </Tooltip>
          </div>
        );
      })}
    </Group>
  );
}
