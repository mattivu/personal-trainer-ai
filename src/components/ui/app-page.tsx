import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "./cn";

type AppPageProps = ComponentPropsWithoutRef<"main"> & {
  children: ReactNode;
  contentClassName?: string;
};

export function AppPage({
  children,
  className,
  contentClassName,
  ...props
}: AppPageProps) {
  return (
    <main className={cn("app-page app-bottom-safe", className)} {...props}>
      <div className={cn("app-container", contentClassName)}>{children}</div>
    </main>
  );
}
