export default function BackgroundOrbs() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <defs>
        <filter id="orb-blur">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>

      {/* Green orb — top-right (primary brand) */}
      <circle
        className="landing-orb-svg landing-orb-svg--1"
        cx="92%"
        cy="-5%"
        r="250"
        fill="rgba(16, 185, 129, 0.38)"
        filter="url(#orb-blur)"
      />

      {/* Teal-green orb — bottom-left (green-shifted from purple) */}
      <circle
        className="landing-orb-svg landing-orb-svg--2"
        cx="-3%"
        cy="90%"
        r="210"
        fill="rgba(20, 184, 166, 0.30)"
        filter="url(#orb-blur)"
      />

      {/* Emerald-blue orb — center (green-tinted blue) */}
      <circle
        className="landing-orb-svg landing-orb-svg--3"
        cx="50%"
        cy="40%"
        r="180"
        fill="rgba(34, 197, 158, 0.25)"
        filter="url(#orb-blur)"
      />
    </svg>
  );
}
