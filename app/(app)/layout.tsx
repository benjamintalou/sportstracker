import { Skeleton } from "@mantine/core";
import { Suspense } from "react";
import { AppFrame } from "@/components/shell/AppFrame";
import { MoveIqSettings } from "@/components/shell/MoveIqSettings";
import { UserMenu } from "@/components/shell/UserMenu";
import { getSpeeds } from "@/lib/prefs";
import { getSession } from "@/lib/session";

async function CurrentUser() {
  const session = await getSession();
  return session ? <UserMenu profile={session.profile} /> : null;
}

async function SpeedSettings() {
  return <MoveIqSettings speeds={await getSpeeds()} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame
      settingsSlot={
        <Suspense fallback={<Skeleton height={34} width={34} radius="md" />}>
          <SpeedSettings />
        </Suspense>
      }
      userSlot={
        <Suspense fallback={<Skeleton circle height={36} />}>
          <CurrentUser />
        </Suspense>
      }
    >
      {children}
    </AppFrame>
  );
}
