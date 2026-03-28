import { Group, SegmentedControl, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

const SOURCE_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'telegram', label: 'تلگرام' },
  { value: 'rss', label: 'RSS' },
  { value: 'cryptopanic', label: 'CryptoPanic' },
  { value: 'newsapi', label: 'NewsAPI' },
];

const LANGUAGE_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'fa', label: 'فارسی' },
  { value: 'en', label: 'English' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'bourse', label: 'بورس' },
  { value: 'crypto', label: 'رمزارز' },
  { value: 'economy', label: 'اقتصاد' },
  { value: 'commodity', label: 'کالا' },
];

export default function NewsFilterBar({ filters, onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <Group gap="md" wrap="wrap">
      <SegmentedControl
        size="xs"
        value={filters.source_type || ''}
        onChange={(v) => update('source_type', v)}
        data={SOURCE_OPTIONS}
      />
      <SegmentedControl
        size="xs"
        value={filters.language || ''}
        onChange={(v) => update('language', v)}
        data={LANGUAGE_OPTIONS}
      />
      <SegmentedControl
        size="xs"
        value={filters.category || ''}
        onChange={(v) => update('category', v)}
        data={CATEGORY_OPTIONS}
      />
      <TextInput
        placeholder="جستجو..."
        leftSection={<IconSearch size={16} />}
        value={filters.search || ''}
        onChange={(e) => update('search', e.currentTarget.value)}
        size="sm"
        style={{ maxWidth: 240 }}
      />
    </Group>
  );
}
