import { ActionIcon, Box, Collapse, Text } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import CoinFundamentalsTable from './CoinFundamentalsTable';
import animStyles from '../../../components/shared/animations.module.css';

export default function CoinFundamentalsTableSection({ periods, rows, isLoading }) {
  const [expanded, setExpanded] = useLocalStorage({ key: 'coin-fund-table', defaultValue: true });

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay4}`}>
      <RallyMainCard
        title={<Text>شاخص‌های بنیادی</Text>}
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm" aria-label={expanded ? 'بستن بخش' : 'باز کردن بخش'}>
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        noPadding
        mb="md"
      >
        <Collapse in={expanded}>
          <CoinFundamentalsTable
            periods={periods}
            rows={rows}
            isLoading={isLoading}
          />
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
