import { Card, Group, ScrollArea, SimpleGrid, Skeleton, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, ThemeIcon, Title, VisuallyHidden } from "@mantine/core";
import { IconHeartbeat, IconMoonOff } from "@tabler/icons-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { GarminErrorState } from "@/components/GarminErrorState";
import { getNights } from "@/lib/data/sleep";
import { dayjs } from "@/lib/dates";
import { GarminError } from "@/lib/garmin/errors";
import { formatCount, formatDuration, formatPercent } from "@/lib/format";
import { rollingWindow, WINDOW_KEYS, type RollingWindow } from "@/lib/period";
import { summarizeSleep, type SleepSummary } from "@/lib/sleep";

export const metadata = { title: "Sommeil" };

export default function SleepPage() {
  return (
    <Stack gap="xl">
      <div>
        <Title order={1} fz={{ base: 36, sm: 48 }}>
          Sommeil
        </Title>
        <Text c="dimmed">Fréquence cardiaque et qualité du sommeil sur des périodes glissantes. Chaque nuit compte pour le jour du réveil.</Text>
      </div>
      <Suspense fallback={<SleepSkeleton />}>
        <SleepStats />
      </Suspense>
    </Stack>
  );
}

const one = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const bpm = (v: number | null) => (v === null ? "—" : `${formatCount(v)} bpm`);
const orDash = <T,>(v: T | null, format: (v: T) => string) => (v === null ? "—" : format(v));

type Column = RollingWindow & { summary: SleepSummary };

async function SleepStats() {
  // Windows are relative to "today": resolve them at request time.
  await connection();
  const windows = WINDOW_KEYS.map(rollingWindow);

  let nights;
  try {
    // One fetch for the widest window; the shorter ones are slices of it.
    nights = await getNights(windows.at(-1)!);
  } catch (error) {
    if (!(error instanceof GarminError)) throw error;
    return <GarminErrorState error={error} />;
  }

  if (nights.length === 0) {
    return (
      <EmptyState
        icon={IconMoonOff}
        title="Aucune nuit enregistrée"
        description="Garmin Connect n'a pas de données de sommeil sur les 12 derniers mois. Portez la montre la nuit pour les voir ici."
      />
    );
  }

  const columns: Column[] = windows.map((w) => ({ ...w, summary: summarizeSleep(nights, w) }));

  return (
    <Stack gap="xl">
      <section aria-labelledby="sleep-hr">
        <Title id="sleep-hr" order={2} fz="lg" mb="sm">
          Fréquence cardiaque pendant le sommeil
        </Title>
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
          {columns.map((c) => (
            <HrCard key={c.key} column={c} />
          ))}
        </SimpleGrid>
      </section>

      <section aria-labelledby="sleep-quality">
        <Title id="sleep-quality" order={2} fz="lg" mb="sm">
          Qualité du sommeil
        </Title>
        <QualityTable columns={columns} />
      </section>
    </Stack>
  );
}

function HrCard({ column: { label, days, summary } }: { column: Column }) {
  return (
    <Card padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb={8}>
        <Text fz="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
          {label}
        </Text>
        <ThemeIcon variant="light" color="gray" size={26} radius="md" aria-hidden>
          <IconHeartbeat size={15} stroke={1.75} />
        </ThemeIcon>
      </Group>
      <Text fz="sm" c="dimmed">
        FC moyenne
      </Text>
      <Text ff="var(--font-display)" fw={700} fz={{ base: 36, sm: 44 }} lh={1.05} className="tabular">
        {bpm(summary.avgHr)}
      </Text>
      <Stack gap={0} mt="md">
        <Text fz="sm" c="dimmed">
          FC la plus basse
        </Text>
        <Group gap={8} align="baseline" wrap="wrap">
          <Text ff="var(--font-display)" fw={700} fz={26} lh={1.1} className="tabular">
            {bpm(summary.minHr?.value ?? null)}
          </Text>
          {summary.minHr && (
            <Text fz="sm" c="dimmed">
              nuit du {dayjs(summary.minHr.date).format("D MMM YYYY")}
            </Text>
          )}
        </Group>
      </Stack>
      <Text fz="xs" c="dimmed" mt="sm" className="tabular">
        {summary.nights} {summary.nights > 1 ? "nuits suivies" : "nuit suivie"} sur {days}
      </Text>
    </Card>
  );
}

type Row = { label: string; hint?: string; value: (s: SleepSummary) => string };

const stage = (key: "deep" | "rem" | "light" | "awake") => (s: SleepSummary) => {
  if (!s.stages) return "—";
  const asleep = s.stages.deep + s.stages.light + s.stages.rem;
  const share = key === "awake" ? "" : asleep > 0 ? ` (${formatPercent(s.stages[key] / asleep)})` : "";
  return `${formatDuration(s.stages[key])}${share}`;
};

const ROWS: Row[] = [
  { label: "Score de sommeil", hint: "moyenne, sur 100", value: (s) => orDash(s.avgScore, (v) => formatCount(v)) },
  { label: "Durée de sommeil", hint: "moyenne par nuit", value: (s) => orDash(s.avgSleep, formatDuration) },
  { label: "Sommeil profond", hint: "part du temps endormi", value: stage("deep") },
  { label: "Sommeil paradoxal", value: stage("rem") },
  { label: "Sommeil léger", value: stage("light") },
  { label: "Éveils", hint: "par nuit", value: stage("awake") },
  { label: "FC au repos", hint: "moyenne", value: (s) => bpm(s.avgRestingHr) },
  { label: "VFC nocturne", hint: "moyenne", value: (s) => orDash(s.avgHrv, (v) => `${formatCount(v)} ms`) },
  { label: "Respiration", hint: "moyenne", value: (s) => orDash(s.avgRespiration, (v) => `${one.format(v)} /min`) },
];

function QualityTable({ columns }: { columns: Column[] }) {
  return (
    <Card padding={0}>
      <ScrollArea type="auto">
        <Table verticalSpacing="sm" horizontalSpacing="md" miw={520} className="tabular">
          <TableThead>
            <TableTr>
              <TableTh scope="col">
                <VisuallyHidden>Mesure</VisuallyHidden>
              </TableTh>
              {columns.map((c) => (
                <TableTh key={c.key} scope="col" ta="right">
                  {c.short}
                </TableTh>
              ))}
            </TableTr>
          </TableThead>
          <TableTbody>
            {ROWS.map((row) => (
              <TableTr key={row.label}>
                <TableTh scope="row" fw={500}>
                  {row.label}
                  {row.hint && (
                    <Text span fz="xs" c="dimmed" fw={400} display="block">
                      {row.hint}
                    </Text>
                  )}
                </TableTh>
                {columns.map((c) => (
                  <TableTd key={c.key} ta="right" fw={600}>
                    {row.value(c.summary)}
                  </TableTd>
                ))}
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      </ScrollArea>
    </Card>
  );
}

function SleepSkeleton() {
  return (
    <Stack gap="xl" aria-busy aria-label="Chargement des données de sommeil">
      <Stack gap="sm">
        <Skeleton h={24} w={320} maw="100%" radius="sm" />
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} h={210} radius="lg" />
          ))}
        </SimpleGrid>
      </Stack>
      <Stack gap="sm">
        <Skeleton h={24} w={200} radius="sm" />
        <Skeleton h={420} radius="lg" />
      </Stack>
    </Stack>
  );
}
