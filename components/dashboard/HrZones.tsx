import { Box, Card, Group, Stack, Text, Title } from "@mantine/core";
import { formatDuration, formatPercent } from "@/lib/format";
import type { Summary } from "@/lib/metrics";
import { SegmentBar } from "./SegmentBar";

const ZONES = [
  { label: "Z1", name: "Récupération" },
  { label: "Z2", name: "Endurance" },
  { label: "Z3", name: "Tempo" },
  { label: "Z4", name: "Seuil" },
  { label: "Z5", name: "VO2 max" },
];

export function HrZones({ summary }: { summary: Summary }) {
  const total = summary.hrZones.reduce((a, b) => a + b, 0);
  const max = Math.max(...summary.hrZones, 1);
  const share = (seconds: number) => (total > 0 ? seconds / total : 0);

  return (
    <Card h="100%">
      <Stack gap="lg">
        <div>
          <Title order={2} fz={22}>
            Zones cardio
          </Title>
          <Text fz="sm" c="dimmed">
            {total > 0
              ? `Temps par zone de fréquence cardiaque · ${formatPercent(summary.hrCoverage)} des activités avec cardio`
              : "Aucune donnée cardio sur la période"}
          </Text>
        </div>

        <SegmentBar
          ariaLabel="Répartition du temps par zone cardio"
          segments={ZONES.map((z, i) => ({
            key: z.label,
            value: summary.hrZones[i as 0],
            color: `var(--zone-${i + 1})`,
            label: `${z.label} ${z.name} · ${formatDuration(summary.hrZones[i as 0])}`,
          }))}
        />

        <Stack gap="md" component="ul" p={0} m={0} style={{ listStyle: "none" }}>
          {ZONES.map((z, i) => {
            const seconds = summary.hrZones[i as 0];
            return (
              <Box component="li" key={z.label}>
                <Group justify="space-between" wrap="nowrap" gap="sm" mb={6}>
                  <Group gap={8} wrap="nowrap">
                    <Box w={10} h={10} style={{ borderRadius: 3, background: `var(--zone-${i + 1})` }} aria-hidden />
                    <Text fz="sm" fw={600}>
                      {z.label}
                    </Text>
                    <Text fz="sm" c="dimmed" truncate>
                      {z.name}
                    </Text>
                  </Group>
                  <Group gap="sm" wrap="nowrap">
                    <Text fz="sm" fw={600} className="tabular">
                      {formatDuration(seconds)}
                    </Text>
                    <Text fz="sm" c="dimmed" w={44} ta="right" className="tabular">
                      {formatPercent(share(seconds))}
                    </Text>
                  </Group>
                </Group>
                <Box h={8} style={{ borderRadius: 4, background: "var(--viz-track)" }}>
                  <Box
                    h="100%"
                    w={`${(seconds / max) * 100}%`}
                    style={{ borderRadius: "0 4px 4px 0", background: `var(--zone-${i + 1})`, transition: "width 300ms ease" }}
                  />
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
