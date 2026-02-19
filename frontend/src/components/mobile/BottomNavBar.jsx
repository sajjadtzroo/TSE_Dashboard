import { useNavigate, useLocation } from 'react-router-dom';
import BOTTOM_NAV_ITEMS from '../../constants/bottomNav';
import rallyColors from '../../theme/rallyColors';
import styles from './BottomNavBar.module.css';

export default function BottomNavBar({ onMorePress }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handlePress = (item) => {
    if (item.key === 'more') {
      onMorePress?.();
    } else {
      navigate(item.path);
    }
  };

  return (
    <nav className={styles.bar}>
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = item.path && location.pathname === item.path;
        const color = isActive ? rallyColors.green : rallyColors.textDimmed;

        return (
          <button
            key={item.key}
            className={styles.item}
            onClick={() => handlePress(item)}
            type="button"
          >
            <item.icon size={22} stroke={1.5} color={color} />
            <span className={styles.label} style={{ color }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
