import { Loader } from '@mantine/core';
import { IconArrowDown } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';
import styles from './PullToRefreshIndicator.module.css';

export default function PullToRefreshIndicator({ pullDistance = 0, isPulling = false, isRefreshing = false }) {
  if (!isPulling && !isRefreshing) return null;

  const opacity = Math.min(pullDistance / 60, 1);
  const rotation = Math.min(pullDistance * 3, 180);

  return (
    <div className={styles.indicator} style={{ opacity, transform: `translateY(${Math.min(pullDistance, 60)}px)` }}>
      <div className={styles.pill}>
        {isRefreshing ? (
          <Loader size={18} color={rallyColors.green} />
        ) : (
          <IconArrowDown
            size={18}
            color={rallyColors.green}
            style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.1s ease' }}
          />
        )}
      </div>
    </div>
  );
}
