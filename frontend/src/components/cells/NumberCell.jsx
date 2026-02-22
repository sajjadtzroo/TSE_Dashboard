import { useRef, useEffect, useState } from 'react';
import { Text } from '@mantine/core';
import { toPersianNum } from '../../utils/formatUtils';

export default function NumberCell({ value, fallback = '-', suffix = '' }) {
  if (value == null) return <Text size="sm">{fallback}</Text>;

  // Flash on value change
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(id);
    }
  }, [value]);

  return (
    <Text
      size="sm"
      style={{
        fontVariantNumeric: 'tabular-nums',
        backgroundColor: flash ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
        borderRadius: flash ? 4 : 0,
        padding: flash ? '1px 4px' : 0,
        transition: 'background-color 0.4s ease',
      }}
    >
      {toPersianNum(value.toLocaleString())}{suffix}
    </Text>
  );
}
