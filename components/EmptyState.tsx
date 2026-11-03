import { Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
}: {
  icon: Icon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Paper withBorder p={{ base: "xl", sm: 48 }}>
      <Stack align="center" gap="md" ta="center" maw={440} mx="auto">
        <ThemeIcon size={64} radius="xl" variant="light">
          <IconComponent size={32} stroke={1.5} />
        </ThemeIcon>
        <Title order={2} fz={28}>
          {title}
        </Title>
        <Text c="dimmed">{description}</Text>
        {action}
      </Stack>
    </Paper>
  );
}
