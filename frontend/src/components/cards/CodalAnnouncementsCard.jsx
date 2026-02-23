import { useState } from 'react';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconExternalLink, IconFileTypePdf } from '@tabler/icons-react';
import RallyMainCard from '../RallyMainCard';
import RallyDataTable from '../RallyDataTable';
import { useCodal } from '../../hooks/useMarketData';
import { codalPdfUrl } from '../../utils/formatUtils';

const PER_PAGE = 5;

const columns = [
  {
    accessor: 'date_publish',
    title: 'تاریخ',
    width: 90,
    noWrap: true,
  },
  {
    accessor: 'title',
    title: 'عنوان',
    ellipsis: true,
    render: (r) => (
      <Tooltip label={r.title} multiline maw={400} withArrow>
        <span>{r.title}</span>
      </Tooltip>
    ),
  },
  {
    accessor: 'actions',
    title: '',
    width: 70,
    render: (r) => (
      <Group gap={4} wrap="nowrap">
        {r.link && (
          <ActionIcon
            size="sm"
            variant="subtle"
            component="a"
            href={r.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="مشاهده در کدال"
          >
            <IconExternalLink size={15} />
          </ActionIcon>
        )}
        {r.link_pdf && (
          <ActionIcon
            size="sm"
            variant="subtle"
            component="a"
            href={codalPdfUrl(r.link_pdf)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="دانلود PDF"
          >
            <IconFileTypePdf size={15} />
          </ActionIcon>
        )}
      </Group>
    ),
  },
];

export default function CodalAnnouncementsCard({ symbol }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCodal({ symbol, page, per_page: PER_PAGE });

  const items = data?.items || [];
  const total = data?.total || 0;

  // Don't render if loaded and no announcements exist
  if (!isLoading && total === 0) return null;

  return (
    <RallyMainCard title="اطلاعیه‌های کدال" mb="md" noPadding>
      <RallyDataTable
        records={items}
        columns={columns}
        loading={isLoading}
        idAccessor="id"
        page={page}
        onPageChange={setPage}
        recordsPerPage={PER_PAGE}
        totalRecords={total}
        minHeight={180}
        density="compact"
      />
    </RallyMainCard>
  );
}
