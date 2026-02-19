import { useState } from 'react';
import { Card, Group, Title, Divider, ActionIcon, Modal } from '@mantine/core';
import { IconMaximize, IconMinimize } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

export default function RallyMainCard({
  title,
  secondary,
  children,
  noPadding = false,
  fullscreenable = false,
  ...props
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const cardContent = (
    <>
      {title && (
        <>
          <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
            {typeof title === 'string' ? (
              <Title order={4}>{title}</Title>
            ) : (
              title
            )}
            <Group gap="xs">
              {secondary}
              {fullscreenable && (
                <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setFullscreen(!fullscreen)} aria-label={fullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}>
                  {fullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
                </ActionIcon>
              )}
            </Group>
          </Group>
          <Divider mb="sm" color={rallyColors.border} />
        </>
      )}
      {noPadding ? children : <div>{children}</div>}
    </>
  );

  if (fullscreen) {
    return (
      <>
        <Card withBorder radius="md" {...props}>
          {title && (
            <>
              <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
                {typeof title === 'string' ? <Title order={4}>{title}</Title> : title}
                <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setFullscreen(false)} aria-label="خروج از تمام صفحه">
                  <IconMaximize size={16} />
                </ActionIcon>
              </Group>
              <Divider mb="sm" color={rallyColors.border} />
            </>
          )}
          {noPadding ? children : <div>{children}</div>}
        </Card>
        <Modal
          opened={fullscreen}
          onClose={() => setFullscreen(false)}
          fullScreen
          title={typeof title === 'string' ? title : 'Chart'}
          styles={{
            body: { height: 'calc(100dvh - 80px)' },
          }}
        >
          {children}
        </Modal>
      </>
    );
  }

  return (
    <Card withBorder radius="md" {...props}>
      {cardContent}
    </Card>
  );
}
