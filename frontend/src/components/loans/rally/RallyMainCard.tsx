import { useState, type ReactNode } from 'react';
import { Card, Group, Title, Divider, ActionIcon, Modal, type CardProps } from '@mantine/core';
import { IconMaximize, IconMinimize } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

interface RallyMainCardProps extends Omit<CardProps, 'title'> {
  title?: ReactNode;
  secondary?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
  fullscreenable?: boolean;
}

export default function RallyMainCard({
  title,
  secondary,
  children,
  noPadding = false,
  fullscreenable = false,
  ...props
}: RallyMainCardProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const cardContent = (
    <>
      {title && (
        <>
          <Group justify="space-between" mb="sm">
            {typeof title === 'string' ? (
              <Title order={4}>{title}</Title>
            ) : (
              title
            )}
            <Group gap="xs">
              {secondary}
              {fullscreenable && (
                <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setFullscreen(!fullscreen)}>
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
              <Group justify="space-between" mb="sm">
                {typeof title === 'string' ? <Title order={4}>{title}</Title> : title}
                <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setFullscreen(true)}>
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
            body: { height: 'calc(100vh - 80px)' },
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
