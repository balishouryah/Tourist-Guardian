/**
 * Placeholder screen component.
 * Used during Stage 1 to verify routing works before building real screens.
 */
export default function Placeholder({ title, stage = '2', experience = 'tourist' }) {
  return (
    <div className="animate-fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: experience === 'tourist' ? '60vh' : '50vh',
      textAlign: 'center',
      gap: 'var(--space-md)',
    }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 48, color: 'var(--outline)' }}
      >
        construction
      </span>
      <h1 className="text-headline-lg-mobile" style={{ color: 'var(--on-surface)' }}>
        {title}
      </h1>
      <p className="text-body-md" style={{ color: 'var(--on-surface-variant)' }}>
        Coming in Stage {stage}
      </p>
    </div>
  );
}
