import { Box } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import DeribitOptionsTable from './DeribitOptionsTable';
import animStyles from '../../../components/shared/animations.module.css';

export default function DeribitOptionsSection() {
  return (
    <Box className={animStyles.sectionEnter}>
      <RallyMainCard title="زنجیره آپشن Deribit" noPadding>
        <Box p="md">
          <DeribitOptionsTable />
        </Box>
      </RallyMainCard>
    </Box>
  );
}
