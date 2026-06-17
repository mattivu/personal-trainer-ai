export type CoachActionKind = "navigation" | "guided";

export type CoachAction = {
  id: string;
  label: string;
  description?: string;
  href: string;
  kind: CoachActionKind;
};
