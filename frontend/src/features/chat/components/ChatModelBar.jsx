import { Group, Loader, Select, TextInput } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

export default function ChatModelBar({
  models,
  modelsLoading,
  selectedModel,
  onModelChange,
  symbolFilter,
  onSymbolChange,
}) {
  const isMobile = useMediaQuery('(max-width: 48em)');

  const modelOptions = models
    .filter((m) => m.id)
    .map((m) => ({
      value: m.id,
      label: `${m.name} (${m.provider})`,
    }));

  return (
    <Group
      p="sm"
      gap="xs"
      style={{
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        flexShrink: 0,
      }}
    >
      <Select
        data={modelOptions}
        value={selectedModel}
        onChange={onModelChange}
        size="xs"
        style={{ flex: 1 }}
        placeholder="مدل را انتخاب کنید"
        rightSection={modelsLoading ? <Loader size={12} /> : undefined}
        disabled={modelsLoading}
      />
      <TextInput
        size="xs"
        placeholder="نماد..."
        value={symbolFilter}
        onChange={(e) => onSymbolChange(e.target.value)}
        style={{ width: isMobile ? 64 : 80 }}
        aria-label="فیلتر نماد"
      />
    </Group>
  );
}
