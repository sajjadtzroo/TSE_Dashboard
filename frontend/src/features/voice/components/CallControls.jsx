import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff, IconPhoneOff } from '@tabler/icons-react';

/**
 * Mute and end-call control buttons.
 */
export default function CallControls({ isMuted, onToggleMute, onEndCall }) {
  return (
    <Group gap="xs">
      <Tooltip label={isMuted ? 'باز کردن میکروفون' : 'بی‌صدا'}>
        <ActionIcon
          variant={isMuted ? 'filled' : 'subtle'}
          color={isMuted ? 'red' : 'gray'}
          size="md"
          radius="xl"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />}
        </ActionIcon>
      </Tooltip>

      <Tooltip label="پایان تماس">
        <ActionIcon variant="filled" color="red" size="md" radius="xl" onClick={onEndCall} aria-label="End call">
          <IconPhoneOff size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
