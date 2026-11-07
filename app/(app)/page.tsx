import { Alert, Card, Group, SimpleGrid, Skeleton, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconAlertTriangle, IconCalendarStats, IconRoute, type Icon } from "@tabler/icons-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { GarminErrorState } from "@/components/GarminErrorState";
import { getRangeActivities } from "@/lib/data/activities";
import { GarminError } from "@/lib/garmin/errors";
import { formatKm } from "@/lib/format";
import { inRange, rollingWindow, WINDOW_KEYS, WINDOWS, type RollingWindow } from "@/lib/period";
import { getSpeeds } from "@/lib/prefs";

export const metadata = { title: "Vélo" };

export default function BikePage() {
  return (
    <Stack gap="xl">
      <div>
        <Title order={1} fz={{ base: 36, sm: 48 }}>
          Vélo
        </Title>
        <Text c="dimmed">Kilomètres parcourus à vélo (route, VTT, gravel et home trainer), sur des périodes glissantes.</Text>
      </div>
      <Suspense fallback={<BikeSkeleton />}>
        <BikeStats />
      </Suspense>
    </Stack>
  );
}

type WindowTotals = RollingWindow & { distance: number; autoDistance: number };

async function BikeStats() {
  // Windows are relative to "today": resolve them at request time.
  await connection();
  const windows = WINDOW_KEYS.map(rollingWindow);
  const year = windows.at(-1)!;
  const speeds = await getSpeeds();

  let data;
  try {
    // One fetch for the widest window; the shorter ones are slices of it.
    data = await getRangeActivities(year, "cycling", { speeds });
  } catch (error) {
    if (!(error instanceof GarminError)) throw error;
    return <GarminErrorState error={error} />;
  }

  const totals: WindowTotals[] = windows.map((w) => {
    const inWindow = data.activities.filter((a) => inRange(a.date, w));
    return {
      ...w,
      distance: inWindow.reduce((sum, a) => sum + a.distance, 0),
      autoDistance: inWindow.reduce((sum, a) => sum + (a.source === "moveiq" ? a.distance : 0), 0),
    };
  });

  return (
    <Stack gap="lg">
      {data.moveIqFailed && (
        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
          Les trajets Move IQ n&apos;ont pas pu être chargés : seules les activités enregistrées sont comptées.
        </Alert>
      )}
      <section aria-labelledby="bike-total">
        <Title id="bike-total" order={2} fz="lg" mb="sm">
          Distance totale
        </Title>
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
          {totals.map((t) => (
            <KmCard key={t.key} icon={IconRoute} label={WINDOWS[t.key].label} value={formatKm(t.distance)} estimated={t.autoDistance} />
          ))}
        </SimpleGrid>
      </section>
      <section aria-labelledby="bike-daily">
        <Title id="bike-daily" order={2} fz="lg" mb="sm">
          Moyenne par jour
        </Title>
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
          {totals.map((t) => (
            <KmCard
              key={t.key}
              icon={IconCalendarStats}
              label={WINDOWS[t.key].label}
              value={formatKm(t.distance / t.days)}
              note={`${formatKm(t.distance)} sur ${t.days} jours`}
              estimated={t.autoDistance / t.days}
            />
          ))}
        </SimpleGrid>
      </section>
    </Stack>
  );
}

function KmCard({ icon: Icon, label, value, note, estimated }: { icon: Icon; label: string; value: string; note?: string; estimated: number }) {
  return (
    <Card padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb={8}>
        <Text fz="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
          {label}
        </Text>
        <ThemeIcon variant="light" color="gray" size={26} radius="md" aria-hidden>
          <Icon size={15} stroke={1.75} />
        </ThemeIcon>
      </Group>
      <Text ff="var(--font-display)" fw={700} fz={{ base: 36, sm: 44 }} lh={1.05} className="tabular">
        {value}
      </Text>
      {note && (
        <Text fz="xs" c="dimmed" mt={4} className="tabular">
          {note}
        </Text>
      )}
      {estimated > 0 && (
        <Text fz="xs" c="dimmed" mt={4} className="tabular">
          dont ≈ {formatKm(estimated)} estimés (Move IQ)
        </Text>
      )}
    </Card>
  );
}

function BikeSkeleton() {
  return (
    <Stack gap="lg" aria-busy aria-label="Chargement des statistiques vélo">
      {[0, 1].map((row) => (
        <Stack key={row} gap="sm">
          <Skeleton h={24} w={180} radius="sm" />
          <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} h={130} radius="lg" />
            ))}
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
}
