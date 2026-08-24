export default function Alerts() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-xl)', textAlign: 'center' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--surface-tint)', opacity: 0.3, marginBottom: 'var(--space-md)' }}>
        notifications_off
      </span>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--space-xs)' }}>No New Alerts</h2>
      <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>
        You're all caught up. Any AI safety alerts or area warnings will appear here.
      </p>
    </div>
  );
}
