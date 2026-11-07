"use client";

import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useMemo } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { SpeedPoint } from "@/lib/speed";

const COLOR = "var(--sport-bike)";
const AXIS = "var(--mantine-color-dimmed)";
const GRID = "var(--viz-track)";
const kmh = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type Row = SpeedPoint & { t: number };

/** Daily average cycling speed (dots) with its 30-day rolling average (line), one hue: both are the same entity. */
export function SpeedChart({ points, rollingDays }: { points: SpeedPoint[]; rollingDays: number }) {
  const rows = useMemo<Row[]>(() => points.map((p) => ({ ...p, t: dayjs(p.date).valueOf() })), [points]);

  // A tick on the first day of every third month.
  const ticks = useMemo(
    () => rows.filter((r) => r.date.endsWith("-01") && Number(r.date.slice(5, 7)) % 3 === 1).map((r) => r.t),
    [rows],
  );

  // Round bounds and evenly spaced ticks (2 or 5 km/h apart) so labels never collide.
  const { min, max, yTicks } = useMemo(() => {
    const values = rows.flatMap((r) => [r.day, r.rolling]).filter((v): v is number => v !== null);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const step = hi - lo > 12 ? 5 : 2;
    const from = Math.max(0, Math.floor(lo / step) * step);
    const to = Math.ceil(hi / step) * step;
    return { min: from, max: to, yTicks: Array.from({ length: (to - from) / step + 1 }, (_, i) => from + i * step) };
  }, [rows]);

  return (
    <Stack gap="sm">
      <Group gap="lg" aria-hidden>
        <Group gap={6} wrap="nowrap">
          <Box w={8} h={8} style={{ borderRadius: "50%", background: COLOR, opacity: 0.45 }} />
          <Text fz="sm">Moyenne du jour</Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Box w={16} h={2} style={{ borderRadius: 1, background: COLOR }} />
          <Text fz="sm">Moyenne glissante {rollingDays} jours</Text>
        </Group>
      </Group>
      <Box h={{ base: 240, sm: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickFormatter={(t: number) => dayjs(t).locale("fr").format("MMM YY")}
              tick={{ fill: AXIS, fontSize: 12 }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              domain={[min, max]}
              ticks={yTicks}
              allowDecimals={false}
              tickFormatter={(v: number) => `${v}`}
              tick={{ fill: AXIS, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              unit=" km/h"
              width={72}
            />
            <Tooltip cursor={{ stroke: AXIS, strokeWidth: 1 }} content={(props) => <SpeedTooltip active={props.active} payload={props.payload as unknown as { payload: Row }[]} />} isAnimationActive={false} />
            <Scatter dataKey="day" fill={COLOR} fillOpacity={0.45} shape="circle" isAnimationActive={false} legendType="none" r={2.5} />
            <Line
              dataKey="rolling"
              stroke={COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, fill: COLOR, stroke: "var(--mantine-color-body)", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Stack>
  );
}

function SpeedTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload: Row }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <Paper withBorder shadow="sm" p="xs" radius="md">
      <Text fz="xs" fw={600} mb={4}>
        {dayjs(row.date).locale("fr").format("dddd D MMMM YYYY")}
      </Text>
      <TooltipRow dot label="Moyenne du jour" value={row.day === null ? "pas de sortie" : `${kmh.format(row.day)} km/h`} />
      <TooltipRow label="Glissante 30 j" value={row.rolling === null ? "—" : `${kmh.format(row.rolling)} km/h`} />
    </Paper>
  );
}

function TooltipRow({ label, value, dot = false }: { label: string; value: string; dot?: boolean }) {
  return (
    <Group gap={6} wrap="nowrap" justify="space-between">
      <Group gap={6} wrap="nowrap">
        <Box
          w={dot ? 8 : 12}
          h={dot ? 8 : 2}
          style={{ borderRadius: dot ? "50%" : 1, background: COLOR, opacity: dot ? 0.45 : 1 }}
          aria-hidden
        />
        <Text fz="xs" c="dimmed">
          {label}
        </Text>
      </Group>
      <Text fz="xs" fw={600} className="tabular">
        {value}
      </Text>
    </Group>
  );
}
