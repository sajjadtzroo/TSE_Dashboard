import { useState } from 'react';
import { Box, Collapse, SimpleGrid, Text, ActionIcon, Group } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyDataTable from '../../../components/RallyDataTable';
import usePagination from '../../../hooks/usePagination';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';

export default function CryptoTomanSection({ tomanMetrics = {} }) {
  const [expanded, setExpanded] = useState(true);
  const coins = tomanMetrics.coins || [];
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(coins);

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 90, render: r => <Text size="sm" fw={600}>{r.symbol}</Text> },
    {
      accessor: 'impliedRate',
      title: 'نرخ ضمنی (تومان)',
      width: 140,
      textAlign: 'end',
      render: r => Number(r.impliedRate).toLocaleString(),
    },
    {
      accessor: 'deviation',
      title: 'انحراف از میانگین',
      width: 140,
      textAlign: 'end',
      render: r => (
        <Text
          size="sm"
          style={{
            color: r.isOutlier
              ? rallyColors.yellow
              : r.deviation >= 0
                ? rallyColors.green
                : rallyColors.red,
            fontWeight: r.isOutlier ? 600 : 400,
          }}
        >
          {r.deviation > 0 ? '+' : ''}{Number(r.deviation).toLocaleString()} ({r.deviationPct > 0 ? '+' : ''}{r.deviationPct}%)
        </Text>
      ),
    },
  ];

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay4}`}>
      <RallyMainCard
        title="پرمیوم تومان"
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm">
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
            <RallyMainCard>
              <Text size="xs" c="dimmed">نرخ ضمنی USDT/IRR</Text>
              <Text size="xl" fw={700} mt={4} style={{ color: rallyColors.blue }}>
                {tomanMetrics.avgRate ? Number(tomanMetrics.avgRate).toLocaleString() : '-'}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>میانگین {coins.length} رمزارز</Text>
            </RallyMainCard>
            <RallyMainCard>
              <Text size="xs" c="dimmed">انحراف معیار</Text>
              <Text size="xl" fw={700} mt={4} style={{ color: rallyColors.yellow }}>
                ±{tomanMetrics.stdDev ? Number(tomanMetrics.stdDev).toLocaleString() : '-'}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>پایین‌تر = سازگاری بیشتر</Text>
            </RallyMainCard>
            <RallyMainCard>
              <Text size="xs" c="dimmed">تعداد آوتلایرها</Text>
              <Text size="xl" fw={700} mt={4} style={{ color: rallyColors.red }}>
                {coins.filter(c => c.isOutlier).length}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>انحراف &gt;1σ — فرصت آربیتراژ</Text>
            </RallyMainCard>
          </SimpleGrid>

          <RallyMainCard title="نرخ ضمنی به تفکیک رمزارز" noPadding>
            <RallyDataTable
              records={paged}
              columns={columns}
              idAccessor="symbol"
              page={page}
              onPageChange={setPage}
              recordsPerPage={perPage}
              onRecordsPerPageChange={setPerPage}
              totalRecords={totalRecords}
              minHeight={300}
            />
          </RallyMainCard>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
