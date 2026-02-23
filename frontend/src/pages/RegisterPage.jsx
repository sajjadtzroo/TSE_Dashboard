import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  TextInput,
  PasswordInput,
  Button,
  Text,
  Stack,
  Alert,
  Anchor,
  Divider,
  Box,
  Progress,
} from '@mantine/core';
import { IconUser, IconLock, IconMail, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import rallyColors from '../theme/rallyColors';
import { getPasswordStrength, STRENGTH_COLORS, STRENGTH_LABELS } from '../utils/passwordStrength';
import AuthLayout from '../features/auth/components/AuthLayout';
import BlurText from '../features/auth/components/BlurText';

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, login, loading, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(username, email, password);
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d) => d.msg).join(' | '));
      else setError('خطا در ثبت‌نام. لطفا دوباره تلاش کنید.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout tagline="داشبورد جامع بازار سرمایه ایران">
      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Title */}
        <motion.div variants={fadeUp} style={{ marginBottom: 28 }}>
          <BlurText
            text="ایجاد حساب جدید"
            direction="bottom"
            delay={120}
            animateBy="words"
            stepDuration={0.35}
            className="auth-form-title"
          />
          <Text size="sm" c={rallyColors.textSecondary} mt={6} style={{ direction: 'rtl' }}>
            برای استفاده از امکانات داشبورد ثبت‌نام کنید
          </Text>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {error && (
              <motion.div
                key="error-alert"
                initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.35 }}
              >
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  variant="light"
                  radius="md"
                  styles={{ message: { color: rallyColors.red } }}
                >
                  {error}
                </Alert>
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <TextInput
                label="نام کاربری"
                placeholder="username"
                description="3-50 کاراکتر، حروف انگلیسی، اعداد و _"
                leftSection={<IconUser size={16} />}
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                required
                radius="md"
                size="md"
                autoComplete="username"
                dir="ltr"
                styles={{ input: { textAlign: 'left' } }}
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <TextInput
                label="ایمیل"
                placeholder="you@example.com"
                leftSection={<IconMail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                radius="md"
                size="md"
                type="email"
                autoComplete="email"
                dir="ltr"
                styles={{ input: { textAlign: 'left' } }}
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <Box>
                <PasswordInput
                  label="رمز عبور"
                  placeholder="حداقل ۸ کاراکتر"
                  leftSection={<IconLock size={16} />}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  required
                  radius="md"
                  size="md"
                  autoComplete="new-password"
                  dir="ltr"
                  styles={{ input: { textAlign: 'left' } }}
                />
                {password.length > 0 && (
                  <Box mt={6}>
                    <Progress value={(strength / 4) * 100} size="xs" radius="xl" color={STRENGTH_COLORS[strength]} />
                    <Text size="xs" c={rallyColors.textDimmed} mt={2}>{STRENGTH_LABELS[strength]}</Text>
                  </Box>
                )}
              </Box>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Button
                type="submit"
                fullWidth
                size="md"
                radius="md"
                loading={submitting}
                color="rally-green"
                mt="xs"
                leftSection={<IconCheck size={18} />}
              >
                ثبت‌نام
              </Button>
            </motion.div>
          </Stack>
        </form>

        <motion.div variants={fadeUp}>
          <Divider my="lg" label="یا" labelPosition="center" color={rallyColors.border} />
          <Text ta="center" size="sm" c={rallyColors.textSecondary} style={{ direction: 'rtl' }}>
            قبلا ثبت‌نام کرده‌اید؟{' '}
            <Anchor component={Link} to="/login" c={rallyColors.green} fw={600}>
              وارد شوید
            </Anchor>
          </Text>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Text ta="center" size="sm" c={rallyColors.textDimmed} mt="md">
            <Anchor component={Link} to="/" c={rallyColors.textSecondary} fw={500}>
              بازگشت به صفحه اصلی
            </Anchor>
          </Text>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
}
