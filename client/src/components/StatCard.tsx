interface Props {
  label: string;
  value: string;
  sub?: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'violet';
  icon?: string;
}

export default function StatCard({ label, value, sub, color, icon }: Props) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-head">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}