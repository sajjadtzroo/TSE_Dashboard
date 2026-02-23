import { useRef } from 'react';
import { animate } from 'motion/react';

/* ── Inline SVG renderer — no Tabler dependency needed ─────────── */
function SvgIcon({ paths, size = 24, color = 'currentColor', strokeWidth = 2, style }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* Arrow-left paths (shared) */
const ARROW_PATHS = ['M5 12l14 0', 'M5 12l6 6', 'M5 12l6 -6'];

const findClosestEdge = (mx, my, w, h) => {
  const topDist = (mx - w / 2) ** 2 + my ** 2;
  const botDist = (mx - w / 2) ** 2 + (my - h) ** 2;
  return topDist < botDist ? 'top' : 'bottom';
};

function FlowingMenuItem({ item, onClick }) {
  const marqueeRef = useRef(null);
  const innerRef   = useRef(null);
  const contentRef = useRef(null);

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const edge = findClosestEdge(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    if (marqueeRef.current) marqueeRef.current.style.transform = edge === 'top' ? 'translateY(-101%)' : 'translateY(101%)';
    if (innerRef.current)   innerRef.current.style.transform   = edge === 'top' ? 'translateY(101%)'  : 'translateY(-101%)';
    animate(marqueeRef.current, { y: '0%' }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    animate(innerRef.current,   { y: '0%' }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    animate(contentRef.current, { opacity: 0.06 }, { duration: 0.35, ease: [0.16, 1, 0.3, 1] });
  };

  const handleMouseLeave = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const edge = findClosestEdge(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    animate(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    animate(innerRef.current,   { y: edge === 'top' ? '101%'  : '-101%' }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    animate(contentRef.current, { opacity: 1 }, { duration: 0.5, ease: [0.16, 1, 0.3, 1] });
  };

  const paths    = item.svgPaths ?? [];
  const marqueeItems = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="fm-marquee-part">
      <SvgIcon paths={paths} size={26} color="rgba(255,255,255,0.55)" strokeWidth={1.5} />
      <span className="fm-marquee-text">{item.text}</span>
    </span>
  ));

  return (
    <li className="fm-item">
      <div
        className="fm-item-link"
        ref={contentRef}
        role="button"
        tabIndex={0}
        onClick={() => onClick(item.route)}
        onKeyDown={(e) => e.key === 'Enter' && onClick(item.route)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Icon ring — dark glass + faint accent border */}
        <div className="fm-item-content">
          <div
            className="fm-icon-ring"
            style={{
              background: 'rgba(6, 8, 14, 0.70)',
              border: `1px solid ${item.accent}14`,
            }}
          >
            <SvgIcon paths={paths} size={22} color={`${item.accent}80`} />
          </div>
          <div className="fm-text">
            <span className="fm-title">{item.text}</span>
            <span className="fm-subtitle" style={{ color: `${item.accent}80` }}>
              {item.subtitle}
            </span>
          </div>
        </div>

        {/* Bullet pills */}
        <div className="fm-bullets">
          {item.bullets.map((b, i) => (
            <span key={i} className="fm-bullet">
              <SvgIcon paths={b.svgPaths ?? []} size={11} />
              {b.text}
            </span>
          ))}
        </div>

        {/* Arrow */}
        <SvgIcon
          paths={ARROW_PATHS}
          size={18}
          color={`${item.accent}55`}
          style={{ flexShrink: 0 }}
        />
      </div>

      {/* Marquee overlay */}
      <div
        className="fm-marquee"
        ref={marqueeRef}
        style={{ backgroundColor: item.accent, transform: 'translateY(101%)' }}
      >
        <div className="fm-marquee-inner-wrap">
          <div className="fm-marquee-inner" ref={innerRef} style={{ transform: 'translateY(-101%)' }}>
            {marqueeItems}
          </div>
        </div>
      </div>
    </li>
  );
}

export default function FlowingMenu({ items = [], onItemClick }) {
  return (
    <div className="fm-wrap">
      <nav>
        <ul className="fm-nav" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((item) => (
            <FlowingMenuItem key={item.text} item={item} onClick={onItemClick} />
          ))}
        </ul>
      </nav>
    </div>
  );
}
