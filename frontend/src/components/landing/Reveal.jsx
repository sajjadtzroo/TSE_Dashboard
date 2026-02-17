import { useState, useEffect } from 'react';
import { useIntersection } from '@mantine/hooks';

export default function Reveal({ children, delay = 0 }) {
  const { ref, entry } = useIntersection({
    threshold: 0.12,
    rootMargin: '0px 0px -32px 0px',
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (entry?.isIntersecting) setVisible(true);
  }, [entry?.isIntersecting]);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s, transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
