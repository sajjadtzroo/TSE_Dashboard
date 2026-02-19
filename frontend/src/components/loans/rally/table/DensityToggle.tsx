import { ActionIcon, Menu } from '@mantine/core';
import { IconRowInsertBottom } from '@tabler/icons-react';
import { useLocalStorage } from '@mantine/hooks';

type Density = 'compact' | 'normal' | 'comfortable';

const densityOptions: { value: Density; label: string }[] = [
  { value: 'compact', label: 'فشرده' },
  { value: 'normal', label: 'معمولی' },
  { value: 'comfortable', label: 'راحت' },
];

export default function DensityToggle() {
  const [density, setDensity] = useLocalStorage<Density>({
    key: 'table-density',
    defaultValue: 'normal',
  });

  return (
    <Menu position="bottom-end" shadow="md" width={150}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" color="gray" aria-label="تراکم جدول">
          <IconRowInsertBottom size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>تراکم جدول</Menu.Label>
        {densityOptions.map((opt) => (
          <Menu.Item
            key={opt.value}
            onClick={() => setDensity(opt.value)}
            style={{ fontWeight: density === opt.value ? 700 : 400 }}
          >
            {opt.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
