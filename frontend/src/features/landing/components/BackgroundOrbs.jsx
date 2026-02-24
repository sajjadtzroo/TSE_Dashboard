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

      {/* Blue orb — top-right (primary brand) */}
      <circle
        className="landing-orb-svg landing-orb-svg--1"
        cx="92%"
        cy="-5%"
        r="250"
        fill="rgba(41, 98, 255, 0.38)"
        filter="url(#orb-blur)"
      />

      {/* Deep blue orb — bottom-left */}
      <circle
        className="landing-orb-svg landing-orb-svg--2"
        cx="-3%"
        cy="90%"
        r="210"
        fill="rgba(29, 78, 216, 0.30)"
        filter="url(#orb-blur)"
      />

      {/* Light blue orb — center */}
      <circle
        className="landing-orb-svg landing-orb-svg--3"
        cx="50%"
        cy="40%"
        r="180"
        fill="rgba(59, 130, 246, 0.25)"
        filter="url(#orb-blur)"
      />
    </svg>
  );
}
