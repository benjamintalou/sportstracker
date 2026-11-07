"use client";

import { ActionIcon, Button, NumberInput, Popover, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";
import { useActionState, useState } from "react";
import { updateMoveIqSpeeds, type SpeedsState } from "@/app/(app)/actions";

export type SpeedSettings = { cycling: number; walking: number; running: number; lap_swimming: number };

const FIELDS: { name: keyof SpeedSettings; label: string }[] = [
  { name: "cycling", label: "Vélo" },
  { name: "walking", label: "Marche" },
  { name: "running", label: "Course" },
  { name: "lap_swimming", label: "Natation" },
];

/**
 * Average speeds used to estimate Move IQ distances (Garmin records none for them).
 * App-wide setting (header): it changes the km on every page, not just one view.
 */
export function MoveIqSettings({ speeds }: { speeds: SpeedSettings }) {
  const [opened, setOpened] = useState(false);
  const [state, action, pending] = useActionState<SpeedsState, FormData>(async (prev, formData) => {
    const result = await updateMoveIqSpeeds(prev, formData);
    if (result.ok) setOpened(false);
    return result;
  }, {});

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={280} withArrow shadow="md" trapFocus>
      <Popover.Target>
        <Tooltip label="Réglages Move IQ" disabled={opened}>
          <ActionIcon variant="default" size="lg" radius="md" aria-label="Réglages Move IQ" onClick={() => setOpened((o) => !o)}>
            <IconAdjustments size={18} stroke={1.75} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <form action={action}>
          <Stack gap="sm">
            <div>
              <Text fw={600} fz="sm">
                Vitesses moyennes Move IQ
              </Text>
              <Text fz="xs" c="dimmed">
                Garmin n&apos;enregistre pas de distance pour les déplacements Move IQ : elle est estimée avec la durée × ces vitesses, sur toutes les pages.
              </Text>
            </div>
            <SimpleGrid cols={2} spacing="xs">
              {FIELDS.map((f) => (
                <NumberInput
                  key={f.name}
                  name={f.name}
                  label={f.label}
                  defaultValue={speeds[f.name]}
                  min={0}
                  max={60}
                  step={0.5}
                  decimalScale={1}
                  decimalSeparator=","
                  suffix=" km/h"
                  size="xs"
                />
              ))}
            </SimpleGrid>
            {state.error && (
              <Text fz="xs" c="red" role="alert">
                {state.error}
              </Text>
            )}
            <Button type="submit" size="xs" loading={pending}>
              Enregistrer
            </Button>
          </Stack>
        </form>
      </Popover.Dropdown>
    </Popover>
  );
}
