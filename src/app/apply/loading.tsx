export default function ApplyLoading(): React.ReactNode {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px' }}
    >
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '13px',
          letterSpacing: '0.04em',
          color: 'rgba(245,240,232,0.72)',
          margin: '0 0 28px',
        }}
      >
        Loading your application…
      </p>
      <div aria-hidden="true" style={{ display: 'grid', gap: '14px' }}>
        {[60, 100, 100, 84].map((width, index) => (
          <div
            key={`${width}-${index}`}
            style={{
              height: index === 0 ? '28px' : '14px',
              width: `${width}%`,
              background: 'rgba(201,168,76,0.10)',
              border: '1px solid rgba(201,168,76,0.12)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
