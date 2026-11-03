"use client";

import { createContext, useContext, useTransition, type TransitionStartFunction } from "react";

type FilterTransition = readonly [pending: boolean, start: TransitionStartFunction];

const FilterTransitionContext = createContext<FilterTransition | null>(null);

/** Shares the filter navigation transition so the content below the filters can show it's stale. */
export function FilterTransitionProvider({ children }: { children: React.ReactNode }) {
  const transition = useTransition();
  return <FilterTransitionContext value={transition}>{children}</FilterTransitionContext>;
}

/** The shared transition, or a local one outside a provider. */
export function useFilterTransition(): FilterTransition {
  const local = useTransition();
  return useContext(FilterTransitionContext) ?? local;
}

/** Fades its content while filtered data loads; the delay avoids a flash on fast (cached) responses. */
export function FilterPending({ children }: { children: React.ReactNode }) {
  const [pending] = useFilterTransition();
  return (
    <div
      aria-busy={pending}
      style={{
        opacity: pending ? 0.5 : 1,
        transition: `opacity 200ms ease ${pending ? "150ms" : "0ms"}`,
      }}
    >
      {children}
    </div>
  );
}
