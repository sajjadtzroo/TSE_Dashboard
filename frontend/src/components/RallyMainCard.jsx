import { useState } from 'react';
import { Card, Group, Title, ActionIcon, Modal } from '@mantine/core';
import { IconMaximize, IconMinimize } from '@tabler/icons-react';
import styles from './RallyMainCard.module.css';

export default function RallyMainCard({
  title,
  secondary,
  children,
  noPadding = false,
  fullscreenable = false,
  accent,
  ...props
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const accentStyle = accent ? { '--accent-color': accent } : undefined;

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
          <div className={styles.separator} />
        </>
      )}
      {noPadding ? children : <div>{children}</div>}
    </>
  );

  if (fullscreen) {
    return (
      <>
        <Card
          radius="md"
          className={`${styles.card} ${accent ? styles.accentBorder : ''}`}
          style={accentStyle}
          {...props}
        >
          {title && (
            <>
              <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
                {typeof title === 'string' ? <Title order={4}>{title}</Title> : title}
                <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setFullscreen(false)} aria-label="خروج از تمام صفحه">
                  <IconMaximize size={16} />
                </ActionIcon>
              </Group>
              <div className={styles.separator} />
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
    <Card
      radius="md"
      className={`${styles.card} ${accent ? styles.accentBorder : ''}`}
      style={accentStyle}
      {...props}
    >
      {cardContent}
    </Card>
  );
}
