import { Box, Card, Group, Stack, Text } from "@mantine/core";
import { formatDuration, formatPercent } from "@/lib/format";
import { delta, type Summary, type Totals } from "@/lib/metrics";
import { Delta } from "./Delta";
import { SegmentBar } from "./SegmentBar";
import { hatch } from "./texture";

const MOVING = "var(--mantine-primary-color-filled)";

/** The headline: real time spent moving, and how much of the outing was stops. */
export function HeroTime({
  current,
  previous,
  previousLabel,
  days,
}: {
  current: Summary;
  previous: Totals;
  previousLabel: string;
  /** Calendar days in the period, for the daily average */
  days: number;
}) {
  const stoppedShare = current.elapsedTime > 0 ? current.stoppedTime / current.elapsedTime : 0;

  return (
    <Card
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--mantine-primary-color-filled) 10%, var(--mantine-color-body)), var(--mantine-color-body) 60%)",
      }}
    >
      <Stack gap="lg">
        <Stack gap={4}>
          <Text fz="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.06em" }}>
            Temps en mouvement
          </Text>
          <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
            <Group align="baseline" gap="md" wrap="wrap">
              <Text
                component="p"
                ff="var(--font-display)"
                fw={700}
                lh={1}
                fz={{ base: 56, sm: 76 }}
                className="tabular"
                style={{ letterSpacing: "-0.01em" }}
              >
                {formatDuration(current.movingTime)}
              </Text>
              <Stack gap={0}>
                <Delta value={delta(current.movingTime, previous.movingTime)} size="md" />
                <Text fz="xs" c="dimmed">
                  vs {previousLabel} ({formatDuration(previous.movingTime)})
                </Text>
              </Stack>
            </Group>
            <Stack gap={2}>
              <Text fz="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.06em" }}>
                Moyenne par jour
              </Text>
              <Text ff="var(--font-display)" fw={700} fz={{ base: 28, sm: 34 }} lh={1} className="tabular">
                {formatDuration(current.movingTime / days)}
              </Text>
              <Text fz="xs" c="dimmed" className="tabular">
                sur {days} {days > 1 ? "jours" : "jour"}
              </Text>
            </Stack>
          </Group>
        </Stack>

        <Stack gap={8}>
          <SegmentBar
            height={16}
            ariaLabel={`${formatDuration(current.movingTime)} en mouvement, ${formatDuration(current.stoppedTime)} à l'arrêt`}
            segments={[
              {
                key: "moving",
                value: current.movingTime - current.autoTime,
                color: MOVING,
                label: `En mouvement, enregistré · ${formatDuration(current.movingTime - current.autoTime)}`,
              },
              {
                key: "auto",
                value: current.autoTime,
                color: MOVING,
                fill: hatch(MOVING),
                label: `En mouvement, détecté par Move IQ · ${formatDuration(current.autoTime)}`,
              },
              {
                key: "stopped",
                value: current.stoppedTime,
                color: "var(--mantine-color-gray-5)",
                label: `À l'arrêt · ${formatDuration(current.stoppedTime)}`,
              },
            ]}
          />
          <Group justify="space-between" gap="xs">
            <Group gap={6} wrap="nowrap">
              <Box w={10} h={10} style={{ borderRadius: 3, background: MOVING }} aria-hidden />
              <Text fz="sm">
                En mouvement <Text span fw={600} className="tabular">{formatPercent(1 - stoppedShare)}</Text>
              </Text>
            </Group>
            {current.autoTime > 0 && (
              <Group gap={6} wrap="nowrap">
                <Box w={10} h={10} style={{ borderRadius: 3, background: hatch(MOVING) }} aria-hidden />
                <Text fz="sm">
                  dont Move IQ <Text span fw={600} className="tabular">{formatDuration(current.autoTime)}</Text>
                </Text>
              </Group>
            )}
            <Group gap={6} wrap="nowrap">
              <Box w={10} h={10} style={{ borderRadius: 3, background: "var(--mantine-color-gray-5)" }} aria-hidden />
              <Text fz="sm">
                À l&apos;arrêt <Text span fw={600} className="tabular">{formatPercent(stoppedShare)}</Text>
              </Text>
            </Group>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}
