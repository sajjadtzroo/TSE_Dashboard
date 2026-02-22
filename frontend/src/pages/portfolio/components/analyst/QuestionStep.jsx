import { motion } from 'motion/react';
import { Card, Radio, Stack, Text } from '@mantine/core';
import rallyColors, { glassCard } from '../../../../theme/rallyColors';

/**
 * Renders 2 questions per stepper step.
 * Uses Radio.Group inside glass-style Cards with entrance animation.
 */
export default function QuestionStep({ questions, answers, onChange }) {
  return (
    <Stack gap="lg">
      {questions.map((q, idx) => (
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card
            padding="lg"
            radius="md"
            style={{
              ...glassCard,
              boxShadow: rallyColors.glassShadow,
            }}
          >
            <Text fw={600} size="md" mb="md" style={{ color: rallyColors.textPrimary }}>
              {q.text}
            </Text>

            <Radio.Group
              value={answers[q.id] != null ? String(answers[q.id]) : ''}
              onChange={(val) => onChange(q.id, Number(val))}
            >
              <Stack gap="xs">
                {q.options.map((opt) => (
                  <Radio
                    key={opt.value}
                    value={String(opt.value)}
                    label={opt.label}
                    styles={{
                      radio: {
                        cursor: 'pointer',
                        borderColor: rallyColors.border,
                        '&:checked': {
                          backgroundColor: rallyColors.blue,
                          borderColor: rallyColors.blue,
                        },
                      },
                      label: {
                        color: rallyColors.textSecondary,
                        cursor: 'pointer',
                        fontSize: 'var(--mantine-font-size-sm)',
                      },
                    }}
                  />
                ))}
              </Stack>
            </Radio.Group>
          </Card>
        </motion.div>
      ))}
    </Stack>
  );
}
