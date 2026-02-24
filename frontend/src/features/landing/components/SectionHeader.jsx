import { Stack, Title, Text } from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

export default function SectionHeader({ badge, title, subtitle }) {
  return (
    <Stack align="center" mb={48} gap="sm" style={{ textAlign: 'center' }}>
      {badge && (
        <span className="landing-pill">
          <IconShieldCheck size={14} color={rallyColors.primary} />
          {badge}
        </span>
      )}
      <Title
        order={2}
        fw={700}
        fz={{ base: 26, sm: 34, md: 44 }}
        style={{
          background: 'linear-gradient(180deg, #E8EAED 0%, rgba(232,234,237,0.5) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.025em',
          lineHeight: 1.1,
        }}
      >
        {title}
      </Title>
      {subtitle && (
        <Text size="md" c={rallyColors.textSecondary} maw={480}>
          {subtitle}
        </Text>
      )}
    </Stack>
  );
}
