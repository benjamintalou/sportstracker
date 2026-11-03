"use client";

import { Group, Loader, ScrollArea, SegmentedControl, Switch, Tooltip } from "@mantine/core";
import { DatePickerInput, DatesProvider } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { SPORT_FILTERS, type SportFilter } from "@/lib/activity";
import { PRESETS, type Preset } from "@/lib/period";
import { useFilterTransition } from "./FilterTransition";
import { MoveIqSettings, type SpeedSettings } from "./MoveIqSettings";

const PRESET_SHORT: Record<Preset, string> = {
  today: "Auj.",
  yesterday: "Hier",
  week: "Semaine",
  month: "Mois",
  year: "Année",
  "30d": "30 j",
  "12m": "12 mois",
  custom: "Dates",
};

type Filters = { preset: Preset; from: string; to: string; sport: SportFilter; moveIq: boolean };
type Props = Filters & { today: string; speeds: SpeedSettings };

/** Period + sport filters, kept in the URL so views are shareable and the back button works. */
export function FilterBar({ preset, from, to, sport, moveIq, today, speeds }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useFilterTransition();
  const [showCustom, setShowCustom] = useState(preset === "custom");
  const [range, setRange] = useState<[string | null, string | null]>([from, to]);

  function navigate(next: Partial<Filters>) {
    const state = { preset, from, to, sport, moveIq, ...next };
    const params = new URLSearchParams();
    if (state.preset === "custom") {
      params.set("from", state.from);
      params.set("to", state.to);
    } else {
      params.set("preset", state.preset);
    }
    if (state.sport !== "all") params.set("sport", state.sport);
    if (!state.moveIq) params.set("moveiq", "off");
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }));
  }

  function onPreset(value: string) {
    if (value === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    navigate({ preset: value as Preset });
  }

  function onRange(value: [string | null, string | null]) {
    setRange(value);
    const [start, end] = value;
    if (start && end) navigate({ preset: "custom", from: dayjs(start).format("YYYY-MM-DD"), to: dayjs(end).format("YYYY-MM-DD") });
  }

  return (
    <Group justify="space-between" gap="sm" wrap="wrap" align="center">
      <Group gap="sm" wrap="wrap" style={{ minWidth: 0 }}>
        <ScrollArea type="never" maw="100%">
          <SegmentedControl
            value={showCustom ? "custom" : preset}
            onChange={onPreset}
            aria-label="Période"
            data={(Object.keys(PRESETS) as Preset[]).map((p) => ({ value: p, label: PRESET_SHORT[p] }))}
          />
        </ScrollArea>
        {showCustom && (
          <DatesProvider settings={{ locale: "fr", firstDayOfWeek: 1 }}>
            <DatePickerInput
              type="range"
              value={range}
              onChange={onRange}
              maxDate={today}
              valueFormat="D MMM YYYY"
              placeholder="Choisir les dates"
              aria-label="Période personnalisée"
              leftSection={<IconCalendar size={16} />}
              miw={240}
              allowSingleDateInRange
            />
          </DatesProvider>
        )}
      </Group>

      <Group gap="sm" wrap="wrap" style={{ minWidth: 0, maxWidth: "100%" }}>
        {pending && <Loader size="xs" aria-label="Chargement" />}
        <Tooltip label="Inclure les déplacements détectés automatiquement par la montre (Move IQ)" withArrow multiline w={240}>
          <Switch
            label="Move IQ"
            checked={moveIq}
            onChange={(event) => navigate({ moveIq: event.currentTarget.checked })}
            size="sm"
          />
        </Tooltip>
        {moveIq && <MoveIqSettings speeds={speeds} />}
        <ScrollArea type="never" maw="100%">
          <SegmentedControl
            value={sport}
            onChange={(value) => navigate({ sport: value as SportFilter })}
            aria-label="Sport"
            data={SPORT_FILTERS.map((s) => ({ value: s.value, label: s.label }))}
          />
        </ScrollArea>
      </Group>
    </Group>
  );
}
