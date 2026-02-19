import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconLayoutList, IconCheck } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

const DENSITY_OPTIONS = [
  { value: 'compact', label: 'فشرده', description: 'ردیف‌های کوچک‌تر برای نمایش بیشتر' },
  { value: 'normal', label: 'عادی', description: 'اندازه پیش‌فرض' },
  { value: 'comfortable', label: 'راحت', description: 'ردیف‌های بزرگ‌تر برای خوانایی بهتر' },
];

export default function DensityToggle() {
  const [density, setDensity] = useLocalStorage({ key: 'table-density', defaultValue: 'normal' });

  return (
    <Menu position="bottom-end" shadow="md" width={220}>
      <Menu.Target>
        <Tooltip label="تراکم جدول" position="bottom">
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="تراکم جدول">
            <IconLayoutList size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>تراکم نمایش</Menu.Label>
        {DENSITY_OPTIONS.map((option) => (
          <Menu.Item
            key={option.value}
            onClick={() => setDensity(option.value)}
            leftSection={
              density === option.value ? (
                <IconCheck size={16} color={rallyColors.accent} />
              ) : (
                <div style={{ width: 16 }} />
              )
            }
            styles={{
              item: {
                fontSize: '0.875rem',
              },
              itemLabel: {
                fontWeight: density === option.value ? 600 : 400,
              },
            }}
          >
            <div>
              <div>{option.label}</div>
              <div style={{ fontSize: '0.75rem', color: rallyColors.textDimmed }}>
                {option.description}
              </div>
            </div>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
