import { ActionIcon, Anchor, Badge, Box, Collapse, Group, SimpleGrid, Text } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import CryptoIcon from '../../../components/CryptoIcon';
import { getCoinMetadata } from '../../../constants/coinMetadata';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';

function InfoRow({ label, children }) {
  return (
    <Box>
      <Text size="xs" c="dimmed" mb={2}>{label}</Text>
      <Text size="sm" fw={500}>{children}</Text>
    </Box>
  );
}

export default function CoinIntroSection({ symbol }) {
  const [expanded, setExpanded] = useLocalStorage({ key: 'coin-fund-intro', defaultValue: true });
  const meta = getCoinMetadata(symbol);

  if (!meta) return null;

  return (
    <Box className={`${animStyles.sectionEnter}`}>
      <RallyMainCard
        title={<Text>{`معرفی ${meta.name_fa}`}</Text>}
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm" aria-label={expanded ? 'بستن بخش' : 'باز کردن بخش'}>
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <Group gap="sm" mb="md" wrap="wrap">
            <CryptoIcon symbol={symbol} size={40} />
            <Box>
              <Group gap="xs" align="center">
                <Text size="lg" fw={700}>{meta.name_fa}</Text>
                <Badge variant="light" color="blue" size="sm">{meta.name_en}</Badge>
                <Badge variant="outline" color="gray" size="xs">{meta.category}</Badge>
              </Group>
            </Box>
          </Group>

          <Text size="sm" c="dimmed" lh={1.8} mb="md" style={{ maxWidth: 720 }}>
            {meta.description}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            <InfoRow label="سال تأسیس">{meta.founded}</InfoRow>
            <InfoRow label="بنیان‌گذار">{meta.founder}</InfoRow>
            <InfoRow label="مکانیزم اجماع">{meta.consensus}</InfoRow>
            <InfoRow label="کاربرد">{meta.useCase}</InfoRow>
            <InfoRow label="وب‌سایت">
              <Anchor
                href={meta.website}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                c={rallyColors.blue}
              >
                {meta.website.replace('https://', '')}
              </Anchor>
            </InfoRow>
          </SimpleGrid>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
