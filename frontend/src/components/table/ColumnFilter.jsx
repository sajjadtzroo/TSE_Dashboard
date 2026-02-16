import { useState } from 'react';
import { Popover, TextInput, Button, NumberInput, Stack, Group, Badge } from '@mantine/core';
import { IconFilter, IconFilterOff, IconCheck } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

/**
 * Column filter popover
 * @param {string} accessor - Column accessor
 * @param {string} type - Filter type: text, number, range
 * @param {any} value - Current filter value
 * @param {Function} onChange - Filter change handler
 * @param {Function} onClear - Clear filter handler
 */
export default function ColumnFilter({ accessor, type = 'text', value, onChange, onClear }) {
  const [opened, setOpened] = useState(false);
  const [localValue, setLocalValue] = useState(value || (type === 'range' ? { min: '', max: '' } : ''));

  const handleApply = () => {
    if (type === 'range') {
      const hasValue = localValue.min !== '' || localValue.max !== '';
      onChange(accessor, hasValue ? localValue : null);
    } else {
      onChange(accessor, localValue || null);
    }
    setOpened(false);
  };

  const handleClear = () => {
    setLocalValue(type === 'range' ? { min: '', max: '' } : '');
    onClear(accessor);
    setOpened(false);
  };

  const isActive = type === 'range'
    ? (value?.min !== undefined || value?.max !== undefined)
    : Boolean(value);

  return (
    <Popover
      position="bottom"
      withArrow
      shadow="md"
      opened={opened}
      onChange={setOpened}
    >
      <Popover.Target>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setOpened((o) => !o);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            marginRight: '4px',
          }}
        >
          {isActive ? (
            <Badge
              size="xs"
              variant="filled"
              color="rally-green"
              leftSection={<IconFilter size={10} />}
              styles={{
                root: {
                  cursor: 'pointer',
                  textTransform: 'none',
                },
              }}
            >
              فیلتر
            </Badge>
          ) : (
            <IconFilter
              size={14}
              color={rallyColors.textDimmed}
              style={{ opacity: 0.5 }}
            />
          )}
        </div>
      </Popover.Target>

      <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
        <Stack gap="xs" style={{ minWidth: 200 }}>
          {type === 'text' && (
            <TextInput
              placeholder="جستجو..."
              value={localValue}
              onChange={(e) => setLocalValue(e.currentTarget.value)}
              size="xs"
            />
          )}

          {type === 'number' && (
            <NumberInput
              placeholder="مقدار..."
              value={localValue}
              onChange={setLocalValue}
              size="xs"
            />
          )}

          {type === 'range' && (
            <>
              <NumberInput
                placeholder="حداقل"
                value={localValue.min}
                onChange={(val) => setLocalValue((prev) => ({ ...prev, min: val }))}
                size="xs"
              />
              <NumberInput
                placeholder="حداکثر"
                value={localValue.max}
                onChange={(val) => setLocalValue((prev) => ({ ...prev, max: val }))}
                size="xs"
              />
            </>
          )}

          <Group gap="xs" justify="space-between">
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconFilterOff size={14} />}
              onClick={handleClear}
            >
              پاک کردن
            </Button>
            <Button
              size="xs"
              variant="filled"
              color="rally-green"
              leftSection={<IconCheck size={14} />}
              onClick={handleApply}
            >
              اعمال
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
