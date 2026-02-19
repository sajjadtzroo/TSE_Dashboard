import styles from './SectionTabs.module.css';

/**
 * Sticky tab bar for section navigation.
 * @param {{ sections: Array<{key: string, label: string, ref: React.RefObject}>, activeIndex: number }} props
 */
export default function SectionTabs({ sections, activeIndex }) {
  const handleClick = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={styles.tabsContainer}>
      {sections.map((section, i) => (
        <button
          key={section.key}
          type="button"
          className={`${styles.tab} ${i === activeIndex ? styles.tabActive : ''}`}
          onClick={() => handleClick(section.ref)}
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}
