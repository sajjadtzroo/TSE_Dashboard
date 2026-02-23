import { useRef } from 'react';
import { animate } from 'motion/react';
import { IconArrowLeft } from '@tabler/icons-react';

const findClosestEdge = (mx, my, w, h) => {
  const topDist = (mx - w / 2) ** 2 + my ** 2;
  const botDist = (mx - w / 2) ** 2 + (my - h) ** 2;
  return topDist < botDist ? 'top' : 'bottom';
};

function FlowingMenuItem({ item, onClick }) {
  const marqueeRef = useRef(null);
  const innerRef = useRef(null);
  const contentRef = useRef(null);

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const edge = findClosestEdge(mx, my, rect.width, rect.height);

    if (marqueeRef.current) {
      marqueeRef.current.style.transform = edge === 'top' ? 'translateY(-101%)' : 'translateY(101%)';
    }
    if (innerRef.current) {
      innerRef.current.style.transform = edge === 'top' ? 'translateY(101%)' : 'translateY(-101%)';
    }

    animate(marqueeRef.current, { y: '0%' }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    animate(innerRef.current,   { y: '0%' }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    // Row content fades down so the marquee reads clearly
    animate(contentRef.current, { opacity: 0.06 }, { duration: 0.35, ease: [0.16, 1, 0.3, 1] });
  };

  const handleMouseLeave = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const edge = findClosestEdge(mx, my, rect.width, rect.height);

    animate(
      marqueeRef.current,
      { y: edge === 'top' ? '-101%' : '101%' },
      { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    );
    animate(
      innerRef.current,
      { y: edge === 'top' ? '101%' : '-101%' },
      { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    );
    animate(contentRef.current, { opacity: 1 }, { duration: 0.5, ease: [0.16, 1, 0.3, 1] });
  };

  const Icon = item.icon;

  const marqueeItems = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="fm-marquee-part">
      <Icon size={26} color="rgba(255,255,255,0.55)" strokeWidth={1.5} />
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
        {/* Icon + title block */}
        <div className="fm-item-content">
          <div
            className="fm-icon-ring"
            style={{
              background: `${item.accent}18`,
              border: `1px solid ${item.accent}30`,
            }}
          >
            <Icon size={22} color={item.accent} />
          </div>
          <div className="fm-text">
            <span className="fm-title">{item.text}</span>
            <span className="fm-subtitle" style={{ color: item.accent }}>
              {item.subtitle}
            </span>
          </div>
        </div>

        {/* Bullet pills */}
        <div className="fm-bullets">
          {item.bullets.map((b, i) => {
            const BIcon = b.icon;
            return (
              <span key={i} className="fm-bullet">
                <BIcon size={11} />
                {b.text}
              </span>
            );
          })}
        </div>

        {/* Arrow */}
        <IconArrowLeft size={18} color={item.accent} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>

      {/* Marquee overlay — slides in from closest edge */}
      <div
        className="fm-marquee"
        ref={marqueeRef}
        style={{ backgroundColor: item.accent, transform: 'translateY(101%)' }}
      >
        <div className="fm-marquee-inner-wrap">
          <div
            className="fm-marquee-inner"
            ref={innerRef}
            style={{ transform: 'translateY(-101%)' }}
          >
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
