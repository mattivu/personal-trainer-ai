import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type ButtonLikeProps = {
  children: ReactNode;
  className?: string;
  href?: string;
};

type SharedButtonProps = ButtonLikeProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

function renderButton(
  props: SharedButtonProps,
  baseClassName: string
) {
  const { children, className, href, type, ...rest } = props;
  const mergedClassName = cn(baseClassName, className);

  if (href) {
    return (
      <Link href={href} className={mergedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type ?? "button"} className={mergedClassName} {...rest}>
      {children}
    </button>
  );
}

export function PrimaryButton(props: SharedButtonProps) {
  return renderButton(props, "app-primary-button w-full");
}

export function SecondaryButton(props: SharedButtonProps) {
  return renderButton(props, "app-secondary-button w-full");
}
