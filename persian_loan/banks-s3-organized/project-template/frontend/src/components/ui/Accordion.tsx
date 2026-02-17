/**
 * Accordion Component - Collapsible sections
 */

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface AccordionItemProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  icon,
  className,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={clsx('border-b border-border-dark last:border-b-0', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-right hover:bg-surface-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-primary-400">{icon}</span>}
          <span className="font-medium text-gray-50">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 text-gray-300">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AccordionProps {
  children: ReactNode;
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
  return (
    <div className={clsx('bg-surface-100 rounded-lg border border-border-light overflow-hidden', className)}>
      {children}
    </div>
  );
}

export default Accordion;
