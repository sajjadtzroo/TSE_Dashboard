import { Select } from '@mantine/core';
import { useMemo } from 'react';

/**
 * Dropdown listing the last 7 trading days.
 * For TSE: Sat–Wed (weekday 6,0,1,2,3). For crypto: every day (24/7 market).
 *
 * Props:
 *   value       – currently selected date string (YYYY-MM-DD) or null for "all"
 *   onChange     – (dateStr | null) => void
 *   tradingDays – which JS weekdays are trading days (default: TSE Sat–Wed)
 *   count       – how many past trading days to show (default 7)
 */
const TSE_TRADING_DAYS = [6, 0, 1, 2, 3]; // Sat, Sun, Mon, Tue, Wed

export default function LiveDayPicker({
  value,
  onChange,
  tradingDays = TSE_TRADING_DAYS,
  count = 7,
}) {
  const dayOptions = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('fa-IR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const options = [{ value: '__all__', label: 'همه روزها' }];
    const today = new Date();
    let found = 0;
    // Walk backwards from today up to 30 calendar days to find `count` trading days
    for (let i = 0; i < 30 && found < count; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (!tradingDays.includes(d.getDay())) continue;
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      options.push({ value: iso, label: fmt.format(d) });
      found++;
    }
    return options;
  }, [tradingDays, count]);

  return (
    <Select
      size="xs"
      value={value ?? '__all__'}
      onChange={(v) => onChange(v === '__all__' ? null : v)}
      data={dayOptions}
      styles={{
        input: { minWidth: 120, fontWeight: 500 },
      }}
      comboboxProps={{ withinPortal: true }}
      allowDeselect={false}
    />
  );
}
