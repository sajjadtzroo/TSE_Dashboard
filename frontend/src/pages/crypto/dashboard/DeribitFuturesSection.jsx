import { useMemo } from 'react';
import { Box } from '@mantine/core';
import { DERIBIT_COINS } from '../../../services/deribit';
import useDeribitLive from '../../../hooks/useDeribitLive';
import RallyMainCard from '../../../components/RallyMainCard';
import DeribitFuturesTable from './DeribitFuturesTable';
import animStyles from '../../../components/shared/animations.module.css';

export default function DeribitFuturesSection() {
  const channels = useMemo(
    () => DERIBIT_COINS.map(c => `ticker.${c.perpetual}.100ms`),
    [],
  );
  const { messages, status } = useDeribitLive(channels);

  return (
    <Box className={animStyles.sectionEnter}>
      <RallyMainCard title="فیوچرز Deribit" noPadding>
        <Box p="md">
          <DeribitFuturesTable messages={messages} status={status} />
        </Box>
      </RallyMainCard>
    </Box>
  );
}
