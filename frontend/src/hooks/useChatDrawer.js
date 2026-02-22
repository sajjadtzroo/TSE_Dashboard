import { useState, useCallback, useEffect } from 'react';

export default function useChatDrawer() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  return { open, setOpen, toggle };
}
