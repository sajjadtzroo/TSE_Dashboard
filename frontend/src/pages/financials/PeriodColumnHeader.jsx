import { ActionIcon, Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';
import { toPersianNum, codalPdfUrl } from '../../utils/formatUtils';

export default function PeriodColumnHeader({ period }) {
  const { periodEndJalali, isAudited, announcementId, codalLinkPdf } = period;

  return (
    <Stack gap={4} align="center">
      <Text size="xs" fw={600}>{toPersianNum(periodEndJalali)}</Text>
      <Group gap={4} wrap="nowrap">
        <Badge
          size="xs"
          variant="light"
          color={isAudited ? 'green' : 'gray'}
        >
          {isAudited ? 'حسابرسی شده' : 'حسابرسی نشده'}
        </Badge>
      </Group>
      <Group gap={2} wrap="nowrap">
        {announcementId && (
          <Tooltip label="دانلود HTML اصلی">
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              component="a"
              href={`/api/codal/financials/${announcementId}/raw`}
              target="_blank"
            >
              <IconDownload size={12} />
            </ActionIcon>
          </Tooltip>
        )}
        {codalLinkPdf && (
          <Tooltip label="مشاهده در کدال">
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              component="a"
              href={codalPdfUrl(codalLinkPdf)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconExternalLink size={12} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Stack>
  );
}
