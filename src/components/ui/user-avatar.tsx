import { cn } from "./cn";

function getNameParts(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function getUserDisplayLabel({
  displayName,
  name,
  email,
}: {
  displayName?: string | null;
  name?: string | null;
  email: string;
}) {
  const normalizedDisplayName = displayName?.trim();

  if (normalizedDisplayName) {
    return normalizedDisplayName;
  }

  const normalizedName = name?.trim();

  if (normalizedName) {
    return normalizedName;
  }

  return email.split("@")[0] || "Il tuo profilo";
}

export function getUserInitials({
  displayName,
  name,
  email,
}: {
  displayName?: string | null;
  name?: string | null;
  email: string;
}) {
  const label = getUserDisplayLabel({ displayName, name, email });
  const parts = getNameParts(label);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase() || "U";
}

type UserAvatarProps = {
  avatarDataUrl?: string | null;
  displayName?: string | null;
  name?: string | null;
  email: string;
  className?: string;
  initialsClassName?: string;
};

export function UserAvatar({
  avatarDataUrl,
  displayName,
  name,
  email,
  className,
  initialsClassName,
}: UserAvatarProps) {
  const initials = getUserInitials({ displayName, name, email });
  const label = getUserDisplayLabel({ displayName, name, email });

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(160deg,#1b2022,#0f1213)] text-[var(--app-primary)] shadow-[0_12px_28px_rgba(0,0,0,0.22)]",
        className,
      )}
      aria-label={label}
    >
      {avatarDataUrl ? (
        <img
          src={avatarDataUrl}
          alt={label}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={cn("font-metrics text-sm font-semibold uppercase tracking-[0.08em]", initialsClassName)}>
          {initials}
        </span>
      )}
    </div>
  );
}
