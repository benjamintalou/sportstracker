import { Group, Text } from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight, IconMinus } from "@tabler/icons-react";

const pct = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0, signDisplay: "exceptZero" });

/**
 * Change vs the previous period. Direction is carried by an icon and a sign,
 * never by color alone. `inverse` for metrics where less is better (stopped time).
 */
export function Delta({ value, inverse = false, size = "sm" }: { value: number | null; inverse?: boolean; size?: "xs" | "sm" | "md" }) {
  if (value === null) {
    return (
      <Text fz={size} c="dimmed" className="tabular">
        —
      </Text>
    );
  }

  const flat = Math.abs(value) < 0.005;
  const good = inverse ? value < 0 : value > 0;
  const color = flat ? "dimmed" : good ? "var(--positive)" : "var(--negative)";
  const Icon = flat ? IconMinus : value > 0 ? IconArrowUpRight : IconArrowDownRight;

  return (
    <Group gap={2} wrap="nowrap" c={color}>
      <Icon size={size === "md" ? 18 : 15} stroke={2} aria-hidden />
      <Text fz={size} fw={600} inherit className="tabular">
        {pct.format(value * 100)} %
      </Text>
    </Group>
  );
}
