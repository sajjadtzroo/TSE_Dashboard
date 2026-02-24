import { useEffect, useState } from 'react';
import { Button, Group, Loader, Modal, NativeSelect, Stack, Text, UnstyledButton, Box } from '@mantine/core';
import { IconPhone } from '@tabler/icons-react';
import { VOICE_MODEL_COLORS, VOICE_MODEL_DESCRIPTIONS_FA } from '../../../constants/voice';

/**
 * Modal for selecting a voice model and voice before starting a call.
 */
export default function ModelPicker({ opened, onClose, onStartCall }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    setError('');
    fetch('/api/voice/models')
      .then((r) => r.json())
      .then((data) => {
        const m = data.models || [];
        setModels(m);
        if (m.length > 0) {
          setSelectedModel(m[0].id);
          setSelectedVoice(m[0].default_voice || '');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('خطا در دریافت مدل‌ها');
        setLoading(false);
      });
  }, [opened]);

  const currentModel = models.find((m) => m.id === selectedModel);

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    const m = models.find((x) => x.id === modelId);
    setSelectedVoice(m?.default_voice || '');
  };

  const handleStart = () => {
    onStartCall(selectedModel, selectedVoice);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={600} size="lg">
          تماس صوتی با هوش مصنوعی
        </Text>
      }
      centered
      size="sm"
    >
      {loading ? (
        <Stack align="center" py="xl">
          <Loader size="md" />
          <Text size="sm" c="dimmed">
            دریافت مدل‌های موجود...
          </Text>
        </Stack>
      ) : error ? (
        <Stack align="center" py="xl">
          <Text c="red" size="sm">
            {error}
          </Text>
        </Stack>
      ) : models.length === 0 ? (
        <Stack align="center" py="xl">
          <Text c="dimmed" size="sm">
            هیچ مدل صوتی فعال نیست. کلیدهای API را تنظیم کنید.
          </Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {/* Model cards */}
          <Stack gap="xs">
            {models.map((m) => {
              const isActive = selectedModel === m.id;
              const color = VOICE_MODEL_COLORS[m.id] || '#888';
              return (
                <UnstyledButton
                  key={m.id}
                  onClick={() => handleModelSelect(m.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${isActive ? color : '#1E2234'}`,
                    background: isActive ? `${color}12` : 'transparent',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Group justify="space-between">
                    <Box>
                      <Text fw={600} size="sm" style={{ color: isActive ? color : undefined }}>
                        {m.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {VOICE_MODEL_DESCRIPTIONS_FA[m.id] || m.provider}
                      </Text>
                    </Box>
                    <Box
                      w={10}
                      h={10}
                      style={{
                        borderRadius: '50%',
                        background: isActive ? color : 'rgba(156, 163, 175,0.2)',
                        transition: 'background 150ms',
                      }}
                    />
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>

          {/* Voice selector */}
          {currentModel?.voices?.length > 0 && (
            <NativeSelect
              label="صدا"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              data={currentModel.voices.map((v) => ({ value: v, label: v }))}
            />
          )}

          {/* Start button */}
          <Button
            fullWidth
            size="md"
            leftSection={<IconPhone size={18} />}
            onClick={handleStart}
            disabled={!selectedModel}
            style={{
              background: selectedModel ? `linear-gradient(135deg, ${VOICE_MODEL_COLORS[selectedModel] || '#22C55E'}, ${VOICE_MODEL_COLORS[selectedModel] || '#16A34A'}dd)` : undefined,
            }}
          >
            شروع تماس
          </Button>
        </Stack>
      )}
    </Modal>
  );
}
