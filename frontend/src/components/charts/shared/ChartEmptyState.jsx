import { motion } from 'motion/react';
import { IconChartBar } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

/**
 * Unified empty state for charts — animated icon with Persian message.
 *
 * @param {Object} props
 * @param {number} [props.height=300] - Container height to match chart
 * @param {string} [props.message='داده‌ای موجود نیست'] - Persian message
 */
export default function ChartEmptyState({
  height = 300,
  message = 'داده\u200Cای موجود نیست',
}) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <IconChartBar
          size={48}
          color={rallyColors.textDimmed}
          style={{ opacity: 0.5 }}
        />
      </motion.div>
      <motion.span
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{
          color: rallyColors.textDimmed,
          fontSize: 13,
        }}
      >
        {message}
      </motion.span>
    </div>
  );
}
