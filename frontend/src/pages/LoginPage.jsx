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
  Divider,
  Box,
} from '@mantine/core';
import { IconUser, IconLock, IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import rallyColors from '../theme/rallyColors';
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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.detail;
      const msg = data?.error?.message
        ?? (typeof detail === 'string' ? detail : null)
        ?? (Array.isArray(detail) ? detail.map((d) => d.msg).join(' | ') : null);
      setError(msg || 'خطا در ورود. لطفا دوباره تلاش کنید.');
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
            text="ورود به حساب"
            direction="bottom"
            delay={120}
            animateBy="words"
            stepDuration={0.35}
            className="auth-form-title"
          />
          <Text size="sm" c={rallyColors.textSecondary} mt={6} style={{ direction: 'rtl' }}>
            برای دسترسی به داشبورد وارد شوید
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
              <PasswordInput
                label="رمز عبور"
                placeholder="********"
                leftSection={<IconLock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                radius="md"
                size="md"
                autoComplete="current-password"
                dir="ltr"
                styles={{ input: { textAlign: 'left' } }}
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <Button
                type="submit"
                fullWidth
                size="lg"
                radius={60}
                variant="outline"
                className="landing-cta landing-cta--shimmer landing-cta-glass-hover"
                loading={submitting}
                mt="xs"
                styles={{
                  root: {
                    height: 48,
                    background: 'rgba(41, 98, 255, 0.12)',
                    borderColor: 'rgba(41, 98, 255, 0.40)',
                    backdropFilter: 'blur(12px)',
                    color: '#2962FF',
                  },
                }}
              >
                ورود
              </Button>
            </motion.div>
          </Stack>
        </form>

        <motion.div variants={fadeUp}>
          <Box mt="lg">
            <Divider mb="md" label="یا" labelPosition="center" color={rallyColors.border} />
            <Button
              component={Link}
              to="/register"
              fullWidth
              size="md"
              radius={60}
              variant="outline"
              className="landing-cta-ghost"
              styles={{
                root: {
                  height: 42,
                  borderColor: 'rgba(42,46,62,0.5)',
                  color: rallyColors.textSecondary,
                },
              }}
            >
              ثبت‌نام کنید
            </Button>
          </Box>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Button
            component={Link}
            to="/"
            fullWidth
            size="sm"
            radius={60}
            variant="subtle"
            color="gray"
            mt="xs"
            styles={{ root: { color: rallyColors.textDimmed } }}
          >
            بازگشت به صفحه اصلی
          </Button>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
}
