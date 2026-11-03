import { Box, Card, Group, Stack, Text, Title } from "@mantine/core";
import { formatDuration, formatKm, formatPercent } from "@/lib/format";
import type { Summary } from "@/lib/metrics";
import { SPORTS } from "@/lib/sports";
import { SegmentBar } from "./SegmentBar";
import { SportLabel } from "./SportSwatch";
import { hatch } from "./texture";

export function SportBreakdown({ summary }: { summary: Summary }) {
  const max = Math.max(...summary.byCategory.map((c) => c.movingTime), 1);

  return (
    <Card h="100%">
      <Stack gap="lg">
        <div>
          <Title order={2} fz={22}>
            Par sport
          </Title>
          <Text fz="sm" c="dimmed">
            Temps en mouvement par discipline
            {summary.autoTime > 0 && " · hachuré : détecté par Move IQ"}
          </Text>
        </div>

        <SegmentBar
          ariaLabel="Répartition du temps par sport"
          segments={summary.byCategory.flatMap((c) => {
            const { label, color } = SPORTS[c.category];
            return [
              {
                key: c.category,
                value: c.movingTime - c.autoTime,
                color,
                label: `${label} · ${formatDuration(c.movingTime - c.autoTime)} enregistré`,
              },
              {
                key: `${c.category}-auto`,
                value: c.autoTime,
                color,
                fill: hatch(color),
                label: `${label} · ${formatDuration(c.autoTime)} détecté par Move IQ`,
              },
            ];
          })}
        />

        <Stack gap="md" component="ul" p={0} m={0} style={{ listStyle: "none" }}>
          {summary.byCategory.map((c) => {
            const color = SPORTS[c.category].color;
            const recorded = c.movingTime - c.autoTime;
            return (
              <Box component="li" key={c.category}>
                <Group justify="space-between" wrap="nowrap" gap="sm" mb={6}>
                  <SportLabel category={c.category} />
                  <Group gap="sm" wrap="nowrap">
                    <Text fz="sm" fw={600} className="tabular">
                      {formatDuration(c.movingTime)}
                    </Text>
                    <Text fz="sm" c="dimmed" w={44} ta="right" className="tabular">
                      {formatPercent(c.share)}
                    </Text>
                  </Group>
                </Group>
                <Box h={8} style={{ borderRadius: 4, background: "var(--viz-track)", display: "flex", gap: 2, overflow: "hidden" }}>
                  {recorded > 0 && (
                    <Box h="100%" w={`${(recorded / max) * 100}%`} style={{ borderRadius: 4, background: color, transition: "width 300ms ease" }} />
                  )}
                  {c.autoTime > 0 && (
                    <Box
                      h="100%"
                      w={`${(c.autoTime / max) * 100}%`}
                      style={{ borderRadius: 4, background: hatch(color), transition: "width 300ms ease" }}
                    />
                  )}
                </Box>
                <Text fz="xs" c="dimmed" mt={4} className="tabular">
                  {[
                    c.count > 0 && `${c.count} ${c.count > 1 ? "activités" : "activité"}`,
                    c.distance > 0 &&
                      (c.autoDistance > 0 ? `${formatKm(c.distance)} (dont ≈ ${formatKm(c.autoDistance)} estimés)` : formatKm(c.distance)),
                    c.autoCount > 0 &&
                      `${c.autoCount} ${c.autoCount > 1 ? "trajets" : "trajet"} Move IQ (${formatDuration(c.autoTime)})`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
