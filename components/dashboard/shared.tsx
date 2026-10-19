import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  icon,
  tone,
  label,
  value,
  suffix,
  detail,
}: {
  icon: ReactNode;
  tone: string;
  label: string;
  value: string;
  suffix: string;
  detail: string;
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon tone-${tone}`}>
        {icon}
        <span className="stat-arrow"><ArrowUpRight size={13} /></span>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}<small>{suffix}</small></div>
      <div className="stat-detail">{detail}</div>
    </article>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span><CalendarDays size={20} /></span>
      <p>{text}</p>
    </div>
  );
}

export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div><h2>{title}</h2><p>{description}</p></div>
      {action}
    </div>
  );
}
