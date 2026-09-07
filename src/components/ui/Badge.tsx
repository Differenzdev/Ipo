import type { LucideIcon } from "lucide-react";

export type BadgeTone = "good" | "warning" | "serious" | "critical" | "accent" | "muted";

const TONE_CLASSES: Record<BadgeTone, string> = {
  good: "bg-good/10 text-good border-good/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  serious: "bg-serious/10 text-serious border-serious/25",
  critical: "bg-critical/10 text-critical border-critical/25",
  accent: "bg-accent/10 text-accent border-accent/25",
  muted: "bg-ink-muted/10 text-ink-secondary border-ink-muted/25",
};

/**
 * Status is never color-alone: every badge carries a text label, and an icon
 * when one is passed, per the dataviz skill's accessibility rule.
 */
export default function Badge({
  tone,
  icon: Icon,
  children,
  className = "",
}: {
  tone: BadgeTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  );
}
