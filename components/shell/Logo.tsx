import { Group, Text, ThemeIcon } from "@mantine/core";
import { IconStopwatch } from "@tabler/icons-react";

export function Logo() {
  return (
    <Group gap={8} wrap="nowrap">
      <ThemeIcon size={32} radius="md" variant="gradient" gradient={{ from: "ember.6", to: "orange.4", deg: 135 }}>
        <IconStopwatch size={20} stroke={2} />
      </ThemeIcon>
      <Text ff="var(--font-display)" fw={700} fz={22} lh={1} style={{ letterSpacing: "0.02em" }} visibleFrom="xs">
        GARMIN<Text span inherit c="ember">TIME</Text>
      </Text>
    </Group>
  );
}
