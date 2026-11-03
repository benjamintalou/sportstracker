import { Box, Group, Text } from "@mantine/core";
import { SPORTS, type SportCategory } from "@/lib/sports";

/** Sport identity: colored mark beside neutral text (text never wears the series color). */
export function SportSwatch({ category, size = 10 }: { category: SportCategory; size?: number }) {
  return <Box w={size} h={size} style={{ borderRadius: 3, background: SPORTS[category].color, flexShrink: 0 }} aria-hidden />;
}

export function SportLabel({ category, fz = "sm" }: { category: SportCategory; fz?: string }) {
  return (
    <Group gap={8} wrap="nowrap">
      <SportSwatch category={category} />
      <Text fz={fz} fw={500} truncate>
        {SPORTS[category].label}
      </Text>
    </Group>
  );
}
