"use client";

import { Box, Tooltip } from "@mantine/core";

export type Segment = { key: string; value: number; color: string; label: string; /** CSS background override, e.g. a hatch texture */ fill?: string };

/**
 * Horizontal stacked bar: segments in the given (fixed) order, separated by a 2px
 * surface gap, 4px rounded ends, with a hover tooltip per segment.
 */
export function SegmentBar({ segments, height = 14, ariaLabel }: { segments: Segment[]; height?: number; ariaLabel: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  return (
    <Box
      role="img"
      aria-label={ariaLabel}
      style={{ display: "flex", gap: 2, height, borderRadius: 4, overflow: "hidden", background: "var(--viz-track)" }}
    >
      {total > 0 &&
        visible.map((s) => (
          <Tooltip key={s.key} label={s.label} withArrow openDelay={50}>
            <Box
              style={{
                flexGrow: s.value / total,
                flexBasis: 0,
                minWidth: 3,
                background: s.fill ?? s.color,
                transition: "flex-grow 300ms ease",
              }}
            />
          </Tooltip>
        ))}
    </Box>
  );
}
