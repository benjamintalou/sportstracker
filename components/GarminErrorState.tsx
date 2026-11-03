import { Alert, Button, Group, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { logout } from "@/app/(auth)/login/actions";
import { GARMIN_ERROR_MESSAGES, type GarminError } from "@/lib/garmin/errors";

export function GarminErrorState({ error }: { error: GarminError }) {
  const needsLogin = error.code === "unauthorized";
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={20} />} title="Impossible de charger vos activités">
      <Text fz="sm">{GARMIN_ERROR_MESSAGES[error.code]}</Text>
      {needsLogin && (
        <Group mt="sm">
          <form action={logout}>
            <Button type="submit" size="xs" variant="light" color="red">
              Se reconnecter
            </Button>
          </form>
        </Group>
      )}
    </Alert>
  );
}
