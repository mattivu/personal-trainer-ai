import Link from "next/link";
import { UserAvatar } from "./user-avatar";

type ProfileLinkProps = {
  email: string;
  name?: string | null;
  displayName?: string | null;
  avatarDataUrl?: string | null;
};

export function ProfileLink({
  email,
  name,
  displayName,
  avatarDataUrl,
}: ProfileLinkProps) {
  return (
    <Link
      href="/settings"
      className="transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]"
      aria-label="Apri impostazioni profilo"
    >
      <UserAvatar
        email={email}
        name={name}
        displayName={displayName}
        avatarDataUrl={avatarDataUrl}
        className="h-11 w-11"
      />
    </Link>
  );
}
