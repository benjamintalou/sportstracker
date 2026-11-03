import { Alert, Card, Grid, GridCol, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconZzz } from "@tabler/icons-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { HeroTime } from "@/components/dashboard/HeroTime";
import { HrZones } from "@/components/dashboard/HrZones";
import { SportBreakdown } from "@/components/dashboard/SportBreakdown";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterPending, FilterTransitionProvider } from "@/components/filters/FilterTransition";
import { GarminErrorState } from "@/components/GarminErrorState";
import { parseSportFilter } from "@/lib/activity";
import { getPeriodActivities } from "@/lib/data/activities";
import { GarminError } from "@/lib/garmin/errors";
import { summarize } from "@/lib/metrics";
import { ISO_DATE, today } from "@/lib/dates";
import { daysIn, parsePeriod } from "@/lib/period";
import { getSpeeds } from "@/lib/prefs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Stack gap="xl">
      <div>
        <Title order={1} fz={{ base: 36, sm: 48 }}>
          Tableau de bord
        </Title>
        <Text c="dimmed">Le temps réellement passé sur vos activités.</Text>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </Stack>
  );
}

async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // Periods are relative to "today": always resolve them at request time.
  await connection();
  const period = parsePeriod(params);
  const sport = parseSportFilter(params.sport);
  const moveIq = params.moveiq !== "off";
  const speeds = await getSpeeds();
  const filters = (
    <FilterBar
      preset={period.preset}
      from={period.from}
      to={period.to}
      sport={sport}
      moveIq={moveIq}
      today={today().format(ISO_DATE)}
      speeds={speeds}
    />
  );

  let data;
  try {
    data = await getPeriodActivities(period, sport, { moveIq, speeds });
  } catch (error) {
    if (!(error instanceof GarminError)) throw error;
    return (
      <FilterTransitionProvider>
        <Stack gap="lg">
          {filters}
          <FilterPending>
            <GarminErrorState error={error} />
          </FilterPending>
        </Stack>
      </FilterTransitionProvider>
    );
  }

  const current = summarize(data.current);
  const previous = summarize(data.previous);

  return (
    <FilterTransitionProvider>
      <Stack gap="lg">
        {filters}
        <FilterPending>
          <Stack gap="lg">
            <Text fz="sm" c="dimmed" mt={-8}>
              {period.label} · comparé avec {period.previousLabel}
            </Text>
            {data.moveIqFailed && (
              <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
                Les déplacements Move IQ n&apos;ont pas pu être chargés : seules les activités enregistrées sont comptées.
              </Alert>
            )}

            {current.count + current.autoCount === 0 ? (
              <EmptyState
                icon={IconZzz}
                title="Aucune activité"
                description="Rien d'enregistré sur cette période pour ce sport. Essayez une autre période."
              />
            ) : (
              <>
                <HeroTime current={current} previous={previous} previousLabel={period.previousLabel} days={daysIn(period)} />
                <StatGrid current={current} previous={previous} days={daysIn(period)} />
                <Grid gap="md">
                  <GridCol span={{ base: 12, md: 7 }}>
                    <SportBreakdown summary={current} />
                  </GridCol>
                  <GridCol span={{ base: 12, md: 5 }}>
                    <HrZones summary={current} />
                  </GridCol>
                </Grid>
              </>
            )}
          </Stack>
        </FilterPending>
      </Stack>
    </FilterTransitionProvider>
  );
}

function DashboardSkeleton() {
  return (
    <Stack gap="lg" aria-busy aria-label="Chargement du tableau de bord">
      <Skeleton h={36} radius="md" w="60%" />
      <Skeleton h={200} radius="lg" />
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} h={110} radius="lg" />
        ))}
      </SimpleGrid>
      <Grid gap="md">
        <GridCol span={{ base: 12, md: 7 }}>
          <Card h={320}>
            <Skeleton h="100%" />
          </Card>
        </GridCol>
        <GridCol span={{ base: 12, md: 5 }}>
          <Card h={320}>
            <Skeleton h="100%" />
          </Card>
        </GridCol>
      </Grid>
    </Stack>
  );
}
