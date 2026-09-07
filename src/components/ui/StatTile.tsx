import type { LucideIcon } from "lucide-react";

export default function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        {Icon && <Icon size={13} strokeWidth={2} />}
        {label}
      </div>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-ink">{value}</p>
    </div>
  );
}
