import { useState, useMemo, useCallback } from 'react';
import { Popover, TextInput, SimpleGrid, Group, Text, ActionIcon, Box } from '@mantine/core';
import { IconCalendar, IconChevronRight, IconChevronLeft } from '@tabler/icons-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isBefore,
  isAfter,
} from 'date-fns-jalali';
import rallyColors from '../../../theme/rallyColors';

interface PersianDatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
}

const WEEKDAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export function PersianDatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  error = false,
  helperText,
  placeholder = 'انتخاب تاریخ',
  required = false,
}: PersianDatePickerProps) {
  const [opened, setOpened] = useState(false);
  const [viewDate, setViewDate] = useState(() => value || new Date());

  const displayValue = value ? format(value, 'yyyy/MM/dd') : '';
  const monthLabel = format(viewDate, 'MMMM yyyy');

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get the day of week for the first day (Saturday = 0 in Jalali)
    const startDayOffset = getDay(monthStart);

    // Pad beginning with nulls
    const padded: (Date | null)[] = Array(startDayOffset).fill(null);
    return [...padded, ...daysInMonth];
  }, [viewDate]);

  const isDisabled = useCallback(
    (day: Date) => {
      if (minDate && isBefore(day, minDate)) return true;
      if (maxDate && isAfter(day, maxDate)) return true;
      return false;
    },
    [minDate, maxDate],
  );

  const handleSelect = (day: Date) => {
    if (isDisabled(day)) return;
    onChange(day);
    setOpened(false);
  };

  return (
    <Popover
      opened={opened && !disabled}
      onChange={setOpened}
      position="bottom-start"
      width={280}
      shadow="lg"
    >
      <Popover.Target>
        <TextInput
          label={label}
          value={displayValue}
          placeholder={placeholder}
          readOnly
          required={required}
          error={error ? helperText || true : undefined}
          disabled={disabled}
          leftSection={<IconCalendar size={18} />}
          onClick={() => setOpened((o) => !o)}
          styles={{
            input: { cursor: disabled ? 'not-allowed' : 'pointer' },
          }}
        />
      </Popover.Target>

      <Popover.Dropdown
        style={{
          backgroundColor: rallyColors.elevated,
          border: `1px solid ${rallyColors.glassBorder}`,
          borderRadius: 8,
        }}
      >
        {/* Month navigation */}
        <Group justify="space-between" mb="xs">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setViewDate((d) => subMonths(d, 1))}
            aria-label="ماه قبل"
          >
            <IconChevronRight size={18} />
          </ActionIcon>
          <Text fw={600} size="sm" c={rallyColors.textPrimary}>
            {monthLabel}
          </Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            aria-label="ماه بعد"
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
        </Group>

        {/* Weekday headers */}
        <SimpleGrid cols={7} spacing={2} mb={4}>
          {WEEKDAY_LABELS.map((day) => (
            <Text
              key={day}
              ta="center"
              size="xs"
              fw={600}
              c={rallyColors.textDimmed}
            >
              {day}
            </Text>
          ))}
        </SimpleGrid>

        {/* Day grid */}
        <SimpleGrid cols={7} spacing={2}>
          {days.map((day, idx) => {
            if (!day) {
              return <Box key={`empty-${idx}`} h={32} />;
            }

            const selected = value && isSameDay(day, value);
            const dayDisabled = isDisabled(day);

            return (
              <Box
                key={idx}
                h={32}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  cursor: dayDisabled ? 'not-allowed' : 'pointer',
                  backgroundColor: selected
                    ? rallyColors.green
                    : 'transparent',
                  opacity: dayDisabled ? 0.3 : 1,
                  transition: 'background-color 0.15s',
                }}
                onClick={() => !dayDisabled && handleSelect(day)}
                onMouseEnter={(e) => {
                  if (!selected && !dayDisabled) {
                    e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Text
                  size="sm"
                  fw={selected ? 700 : 400}
                  c={selected ? '#fff' : rallyColors.textPrimary}
                >
                  {format(day, 'd')}
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}

export default PersianDatePicker;
