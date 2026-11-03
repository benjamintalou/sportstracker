import { Skeleton, Stack } from "@mantine/core";

/** Route-level fallback for app pages: title block + a content placeholder. */
export default function Loading() {
  return (
    <Stack gap="xl" aria-busy aria-label="Chargement de la page">
      <Stack gap="xs">
        <Skeleton h={48} w={{ base: "70%", sm: 360 }} radius="md" />
        <Skeleton h={18} w={{ base: "90%", sm: 420 }} radius="sm" />
      </Stack>
      <Skeleton h={44} radius="md" />
      <Skeleton h={320} radius="lg" />
    </Stack>
  );
}
