import { useState, useMemo, useCallback } from 'react';
import { Stepper, Button, Group, Progress, Text, Box } from '@mantine/core';
import { IconChevronRight, IconChevronLeft, IconCheck } from '@tabler/icons-react';
import QuestionStep from './QuestionStep';
import QuestionnaireResult from './QuestionnaireResult';
import { STEPS, QUESTIONS } from '../../../../constants/riskQuestions';
import { computeRiskScore } from '../../../../utils/riskProfileScoring';
import rallyColors from '../../../../theme/rallyColors';

const TOTAL_STEPS = STEPS.length; // 6 question steps + 1 result step

/**
 * Full stepper questionnaire with 6 question steps + result step.
 * Calls onComplete(scoreResult, answers) when user saves the profile.
 */
export default function RiskQuestionnaire({ onComplete }) {
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // Questions for the current step
  const stepQuestions = useMemo(
    () => QUESTIONS.filter((q) => q.step === active),
    [active],
  );

  // Can proceed to next step? Both questions in current step must be answered
  const canNext = useMemo(
    () => stepQuestions.every((q) => answers[q.id] != null),
    [stepQuestions, answers],
  );

  // Progress percentage (answered / total questions)
  const answeredCount = QUESTIONS.filter((q) => answers[q.id] != null).length;
  const progressPct = Math.round((answeredCount / QUESTIONS.length) * 100);

  // Score result (computed when on result step)
  const scoreResult = useMemo(() => {
    if (active < TOTAL_STEPS) return null;
    return computeRiskScore(answers);
  }, [active, answers]);

  const handleNext = () => {
    if (active < TOTAL_STEPS) setActive((s) => s + 1);
  };
  const handleBack = () => {
    if (active > 0) setActive((s) => s - 1);
  };

  const handleSave = () => {
    if (scoreResult && onComplete) {
      onComplete(scoreResult, answers);
    }
  };

  const isResultStep = active >= TOTAL_STEPS;

  return (
    <Box>
      {/* Progress bar */}
      <Group gap="sm" mb="md" align="center">
        <Progress value={progressPct} size="sm" radius="xl" style={{ flex: 1 }} color={rallyColors.blue} />
        <Text size="xs" c="dimmed" style={{ minWidth: 48 }}>
          {answeredCount} / {QUESTIONS.length}
        </Text>
      </Group>

      {/* Stepper */}
      <Stepper
        active={active}
        onStepClick={setActive}
        size="sm"
        color={rallyColors.blue}
        styles={{
          separator: { backgroundColor: rallyColors.border },
          stepIcon: { backgroundColor: rallyColors.elevated, borderColor: rallyColors.border },
          stepLabel: { color: rallyColors.textSecondary, fontSize: 'var(--mantine-font-size-xs)' },
        }}
      >
        {STEPS.map((step, idx) => {
          const stepQs = QUESTIONS.filter((q) => q.step === idx);
          const completed = stepQs.every((q) => answers[q.id] != null);
          return (
            <Stepper.Step
              key={idx}
              label={step.label}
              completedIcon={<IconCheck size={16} />}
              allowStepSelect={completed || idx < active}
            />
          );
        })}
        <Stepper.Completed>
          {/* result step intentionally empty here; content rendered below */}
        </Stepper.Completed>
      </Stepper>

      {/* Step Content */}
      <Box mt="xl">
        {isResultStep ? (
          <QuestionnaireResult scoreResult={scoreResult} onSave={handleSave} />
        ) : (
          <QuestionStep
            questions={stepQuestions}
            answers={answers}
            onChange={handleAnswer}
          />
        )}
      </Box>

      {/* Navigation */}
      {!isResultStep && (
        <Group justify="space-between" mt="xl">
          <Button
            variant="subtle"
            onClick={handleBack}
            disabled={active === 0}
            leftSection={<IconChevronRight size={16} />}
            color="gray"
          >
            مرحله قبل
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canNext}
            rightSection={<IconChevronLeft size={16} />}
            style={{
              backgroundColor: canNext ? rallyColors.blue : undefined,
            }}
          >
            {active === TOTAL_STEPS - 1 ? 'مشاهده نتیجه' : 'مرحله بعد'}
          </Button>
        </Group>
      )}
    </Box>
  );
}
