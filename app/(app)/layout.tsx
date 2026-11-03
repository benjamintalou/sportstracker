import { Skeleton } from "@mantine/core";
import { Suspense } from "react";
import { AppFrame } from "@/components/shell/AppFrame";
import { UserMenu } from "@/components/shell/UserMenu";
import { getSession } from "@/lib/session";

async function CurrentUser() {
  const session = await getSession();
  return session ? <UserMenu profile={session.profile} /> : null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame
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
