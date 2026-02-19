import { useState } from 'react';
import { Group, Loader, Text, Tooltip } from '@mantine/core';
import { IconPhone } from '@tabler/icons-react';
import { VOICE_MODEL_COLORS, VOICE_MODEL_LABELS } from '../../../constants/voice';
import useVoiceCall from '../../../hooks/useVoiceCall';
import AudioVisualizer from './AudioVisualizer';
import CallControls from './CallControls';
import ModelPicker from './ModelPicker';
import VoiceToolActivity from './VoiceToolActivity';
import classes from './VoiceCallOverlay.module.css';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Voice calling overlay — FAB button + top bar during active call.
 * Rendered globally inside BaseLayout.
 */
export default function VoiceCallOverlay() {
  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    callState,
    activeModel,
    activeToolCalls,
    duration,
    errorMessage,
    isMuted,
    startCall,
    endCall,
    resetCall,
    toggleMute,
    inputAnalyser,
  } = useVoiceCall();

  const isIdle = callState === 'idle';
  const isConnecting = callState === 'connecting';
  const isActive = callState === 'active';
  const isEnded = callState === 'ended';
  const isError = callState === 'error';

  const modelColor = VOICE_MODEL_COLORS[activeModel] || '#6366F1';

  return (
    <>
      {/* ── FAB Button (visible when idle or ended) ─── */}
      {(isIdle || isEnded) && (
        <Tooltip label="تماس صوتی" position="left" withArrow>
          <button
            className={classes.voiceFab}
            onClick={() => {
              if (isEnded) resetCall();
              setPickerOpen(true);
            }}
            aria-label="Start voice call"
          >
            <IconPhone size={20} />
          </button>
        </Tooltip>
      )}

      {/* ── Model Picker Modal ─── */}
      <ModelPicker opened={pickerOpen} onClose={() => setPickerOpen(false)} onStartCall={startCall} />

      {/* ── Connecting Bar ─── */}
      {isConnecting && (
        <div className={`${classes.callBar} ${classes.connectingBar}`}>
          <Loader size="xs" color="indigo" />
          <Text size="sm" c="dimmed">
            در حال اتصال...
          </Text>
        </div>
      )}

      {/* ── Active Call Bar ─── */}
      {isActive && (
        <div className={`${classes.callBar} ${classes.activeBar}`} style={{ borderBottomColor: `${modelColor}30` }}>
          <Group gap="sm" style={{ flex: 1, justifyContent: 'center' }}>
            <div className={classes.liveDot} />
            <AudioVisualizer analyserNode={inputAnalyser} color={modelColor} width={40} height={20} barCount={4} />
            <Text size="xs" fw={600} style={{ color: modelColor }}>
              {VOICE_MODEL_LABELS[activeModel] || activeModel}
            </Text>
            <Text className={classes.timer} c="dimmed">
              {formatDuration(duration)}
            </Text>
            <VoiceToolActivity toolCalls={activeToolCalls} />
            <CallControls isMuted={isMuted} onToggleMute={toggleMute} onEndCall={endCall} />
          </Group>
        </div>
      )}

      {/* ── Error Bar ─── */}
      {isError && (
        <div className={`${classes.callBar} ${classes.errorBar}`}>
          <Text size="sm" c="red">
            {errorMessage || 'خطا در تماس صوتی'}
          </Text>
          <button
            className={classes.voiceFab}
            style={{
              position: 'static',
              width: 32,
              height: 32,
              background: 'rgba(239, 68, 68, 0.15)',
            }}
            onClick={resetCall}
          >
            <Text size="xs" c="red" fw={600}>
              &#x2715;
            </Text>
          </button>
        </div>
      )}
    </>
  );
}
