import { Stack, Title, Text } from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

export default function SectionHeader({ badge, title, subtitle }) {
  return (
    <Stack align="center" mb={48} gap="sm" style={{ textAlign: 'center' }}>
      {badge && (
        <span className="landing-pill">
          <IconShieldCheck size={14} color={rallyColors.green} />
          {badge}
        </span>
      )}
      <Title
        order={2}
        fw={700}
        fz={{ base: 28, sm: 36, md: 48 }}
        style={{
          background: 'linear-gradient(180deg, #F1F5F9 0%, rgba(241,245,249,0.5) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
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
