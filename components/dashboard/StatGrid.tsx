import { Card, Group, SimpleGrid, Text, ThemeIcon } from "@mantine/core";
import { IconActivity, IconClockPause, IconHourglass, IconMountain, IconRoute, type Icon } from "@tabler/icons-react";
import { formatCount, formatDecimal, formatDuration, formatKm, formatMeters } from "@/lib/format";
import { delta, type Totals } from "@/lib/metrics";
import { Delta } from "./Delta";

type Stat = {
  key: keyof Totals;
  label: string;
  icon: Icon;
  format: (v: number) => string;
  inverse?: boolean;
  /** Estimated part of the value (Move IQ), shown as a note */
  estimated?: keyof Totals;
  /** Formatter for the daily average when it differs from `format` (fractional counts) */
  perDay?: (v: number) => string;
};

const STATS: Stat[] = [
  { key: "elapsedTime", label: "Temps écoulé", icon: IconHourglass, format: formatDuration },
  { key: "stoppedTime", label: "Temps d'arrêt", icon: IconClockPause, format: formatDuration, inverse: true },
  { key: "distance", label: "Distance", icon: IconRoute, format: formatKm, estimated: "autoDistance" },
  { key: "elevationGain", label: "Dénivelé +", icon: IconMountain, format: formatMeters },
  { key: "count", label: "Activités", icon: IconActivity, format: formatCount, perDay: formatDecimal },
];

export function StatGrid({ current, previous, days }: { current: Totals; previous: Totals; days: number }) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md">
      {STATS.map(({ key, label, icon: Icon, format, inverse, estimated, perDay = format }) => (
        <Card key={key} padding="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap" mb={6}>
            <Text fz="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
              {label}
            </Text>
            <ThemeIcon variant="light" color="gray" size={26} radius="md" aria-hidden>
              <Icon size={15} stroke={1.75} />
            </ThemeIcon>
          </Group>
          <Text ff="var(--font-display)" fw={700} fz={{ base: 24, sm: 28 }} lh={1.1} className="tabular">
            {format(current[key])}
          </Text>
          <Text fz="xs" c="dimmed" mt={2} className="tabular">
            {perDay(current[key] / days)} / jour
          </Text>
          <Group gap={6} mt={6} wrap="nowrap">
            <Delta value={delta(current[key], previous[key])} inverse={inverse} size="xs" />
            <Text fz="xs" c="dimmed" truncate>
              {format(previous[key])}
            </Text>
          </Group>
          {estimated && current[estimated] > 0 && (
            <Text fz="xs" c="dimmed" mt={4} className="tabular">
              dont ≈ {format(current[estimated])} estimés (Move IQ)
            </Text>
          )}
        </Card>
      ))}
    </SimpleGrid>
  );
}
