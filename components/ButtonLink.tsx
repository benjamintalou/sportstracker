"use client";

import { Button, type ButtonProps } from "@mantine/core";
import Link from "next/link";

/** Mantine Button rendered as a Next Link — usable from Server Components. */
export function ButtonLink({ href, ...props }: ButtonProps & { href: string; children: React.ReactNode }) {
  return <Button component={Link} href={href} {...props} />;
}
