import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconDownload, IconExternalLink, IconLock, IconLockOpen } from '@tabler/icons-react';
import { toPersianNum, codalPdfUrl } from '../../utils/formatUtils';
import classes from './PeriodColumnHeader.module.css';

export default function PeriodColumnHeader({ period }) {
  const { periodEndJalali, isAudited, announcementId, codalLinkPdf } = period;

  return (
    <Group gap={4} wrap="nowrap" justify="center" align="center">
      <Text size="xs" fw={700} style={{ whiteSpace: 'nowrap' }}>
        {toPersianNum(periodEndJalali)}
      </Text>
      <Tooltip label={isAudited ? 'حسابرسی شده' : 'حسابرسی نشده'} withArrow>
        {isAudited
          ? <IconLock size={11} color="var(--mantine-color-green-5)" />
          : <IconLockOpen size={11} color="var(--mantine-color-dimmed)" />
        }
      </Tooltip>
      <Group gap={2} wrap="nowrap" className={classes.actionGroup}>
        {announcementId && (
          <Tooltip label="دانلود HTML اصلی" withArrow>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              component="a"
              href={`/api/codal/financials/${announcementId}/raw`}
              target="_blank"
            >
              <IconDownload size={11} />
            </ActionIcon>
          </Tooltip>
        )}
        {codalLinkPdf && (
          <Tooltip label="مشاهده در کدال" withArrow>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              component="a"
              href={codalPdfUrl(codalLinkPdf)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconExternalLink size={11} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Group>
  );
}
