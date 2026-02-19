import { SimpleGrid, Card, Text, Group, Avatar, Box, Stack } from '@mantine/core';
import { IconQuote } from '@tabler/icons-react';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import rallyColors from '../../../theme/rallyColors';
import { TESTIMONIALS } from '../../../constants/landing';

export default function TestimonialsSection() {
  return (
    <Box py={64} id="testimonials">
      <SectionHeader
        title="نظرات کاربران"
        subtitle="آنچه کاربران ما درباره پلتفرم می‌گویند"
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mt="xl">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <Card
              radius="lg"
              p="lg"
              style={{
                backgroundColor: rallyColors.glassBg,
                border: `1px solid ${rallyColors.glassBorder}`,
                backdropFilter: rallyColors.glassBlur,
                height: '100%',
              }}
            >
              <Stack gap="md" justify="space-between" style={{ height: '100%' }}>
                <Box>
                  <IconQuote size={20} color={rallyColors.green} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <Text size="sm" c={rallyColors.textSecondary} lh={1.7}>
                    {t.text}
                  </Text>
                </Box>

                <Group gap="sm" mt="auto">
                  <Avatar size={36} radius="xl" color="rally-green" styles={{ root: { fontWeight: 600 } }}>
                    {t.avatar}
                  </Avatar>
                  <Box>
                    <Text size="sm" fw={600} c={rallyColors.textPrimary}>{t.name}</Text>
                    <Text size="xs" c={rallyColors.textDimmed}>{t.role}</Text>
                  </Box>
                </Group>
              </Stack>
            </Card>
          </Reveal>
        ))}
      </SimpleGrid>
    </Box>
  );
}
