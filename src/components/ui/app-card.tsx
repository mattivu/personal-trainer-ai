import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "./cn";

type AppCardProps = ComponentPropsWithoutRef<"section"> & {
  children: ReactNode;
  soft?: boolean;
};

export function AppCard({
  children,
  className,
  soft = false,
  ...props
}: AppCardProps) {
  return (
    <section
      className={cn(soft ? "app-card-soft" : "app-card", "p-5 sm:p-6", className)}
      {...props}
    >
      {children}
    </section>
  );
}
