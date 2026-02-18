import { useNavigate } from 'react-router-dom';
import { motion } from "motion/react";
import { Box, SimpleGrid, Title, Text, Button, Group, Badge } from '@mantine/core';
import { IconCheck, IconX, IconArrowLeft, IconSparkles } from '@tabler/icons-react';
import { PRICING_PLANS } from '../../../constants/landing';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import rallyColors from '../../../theme/rallyColors';

export default function PricingPlans() {
  const navigate = useNavigate();

  return (
    <Box id="pricing" pb={96}>
      <Reveal>
        <SectionHeader
          badge="تعرفه‌ها"
          title="پلن مناسب خود را انتخاب کنید"
          subtitle="از داشبورد رایگان شروع کنید یا با پلن حرفه‌ای به تمام امکانات دسترسی پیدا کنید"
        />
      </Reveal>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {PRICING_PLANS.map((plan, i) => (
          <Reveal key={plan.name} delay={i * 0.1}>
            <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Box
                className={`landing-glow-card landing-pricing-card ${plan.featured ? 'landing-pricing-card--featured' : ''}`}
                style={{ position: 'relative' }}
              >
                {plan.featured && (
                  <Badge
                    size="sm"
                    variant="filled"
                    color="teal"
                    leftSection={<IconSparkles size={12} />}
                    style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}
                  >
                    پیشنهادی
                  </Badge>
                )}

                <Text fw={700} fz={20} c="#F1F5F9" mb={4}>
                  {plan.name}
                </Text>

                <Group gap={6} align="baseline" mb="xs">
                  <Title
                    order={3}
                    fw={800}
                    fz={{ base: 28, md: 32 }}
                    style={{
                      background: 'linear-gradient(180deg, #F1F5F9 0%, rgba(241,245,249,0.55) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {plan.price}
                  </Title>
                  {plan.period && (
                    <Text size="sm" c={rallyColors.textDimmed}>
                      {plan.period}
                    </Text>
                  )}
                </Group>

                <Box
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    margin: '16px 0',
                    paddingTop: 16,
                    flex: 1,
                  }}
                >
                  {plan.features.map((f) => (
                    <div key={f.text} className="landing-pricing-check">
                      {f.included ? (
                        <IconCheck size={16} color={rallyColors.green} />
                      ) : (
                        <IconX size={16} color="rgba(148,163,184,0.3)" />
                      )}
                      <Text
                        span
                        size="sm"
                        c={f.included ? '#CBD5E1' : 'rgba(148,163,184,0.35)'}
                      >
                        {f.text}
                      </Text>
                    </div>
                  ))}
                </Box>

                <Button
                  fullWidth
                  size="md"
                  radius={12}
                  mt="md"
                  disabled={plan.disabled}
                  onClick={plan.route ? () => navigate(plan.route) : undefined}
                  variant={plan.disabled ? 'outline' : 'filled'}
                  color={plan.disabled ? 'gray' : undefined}
                  className={plan.disabled ? undefined : 'landing-cta'}
                  styles={{
                    root: plan.disabled
                      ? { borderColor: 'rgba(148,163,184,0.15)' }
                      : {
                          background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                          border: 'none',
                          fontWeight: 700,
                        },
                  }}
                  leftSection={plan.disabled ? undefined : <IconArrowLeft size={16} />}
                  rightSection={
                    plan.disabled ? (
                      <Badge size="xs" variant="light" color="gray">
                        به‌زودی
                      </Badge>
                    ) : undefined
                  }
                >
                  {plan.cta}
                </Button>
              </Box>
            </motion.div>
          </Reveal>
        ))}
      </SimpleGrid>
    </Box>
  );
}
