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

export function LoadingSkeleton() {
  return (
    <div className="skeleton-page" role="status" aria-live="polite" aria-label="กำลังโหลดข้อมูล">
      <div className="stats-grid">
        {[0, 1, 2, 3].map((item) => <div className="skeleton skeleton-card" key={item} />)}
      </div>
      <div className="skeleton skeleton-panel" />
      <div className="skeleton skeleton-panel short" />
    </div>
  );
}

export function SubmitHint({ offline }: { offline: boolean }) {
  if (!offline) return null;
  return <p className="offline-hint">เชื่อมต่อฐานข้อมูลไม่ได้ในขณะนี้ จึงยังบันทึกข้อมูลไม่ได้</p>;
}
