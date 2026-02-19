import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Box,
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Group,
  Stack,
  Alert,
  Anchor,
  Divider,
  Progress,
} from '@mantine/core';
import { IconUser, IconLock, IconMail, IconAlertCircle, IconCheck, IconChartBar } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import rallyColors from '../theme/rallyColors';
import { getPasswordStrength, STRENGTH_COLORS, STRENGTH_LABELS } from '../utils/passwordStrength';

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(username, email, password);
      // Auto-login after successful registration
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(' | '));
      } else {
        setError('خطا در ثبت‌نام. لطفا دوباره تلاش کنید.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      className="landing-bg"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
    >
      <div className="landing-dot-grid" />

      {/* Ambient glow */}
      <Box
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rallyColors.green}12 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <Container size={440} style={{ position: 'relative', zIndex: 1, width: '100%' }} py="xl">
        <motion.div variants={stagger} initial="hidden" animate="show">
          {/* Logo */}
          <motion.div variants={fadeUp}>
            <Group justify="center" mb="xl" gap="xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconChartBar size={22} color="#fff" stroke={1.8} />
              </Box>
              <Box>
                <Text fw={700} size="sm" c={rallyColors.textPrimary} lh={1.2}>Financial Dashboard</Text>
                <Text size="xs" c={rallyColors.textDimmed} lh={1.2}>Tehran Stock Exchange</Text>
              </Box>
            </Group>
          </motion.div>

          {/* Card */}
          <motion.div variants={fadeUp}>
            <Paper
              radius="lg"
              p="xl"
              style={{
                backgroundColor: rallyColors.glassBg,
                border: `1px solid ${rallyColors.glassBorder}`,
                backdropFilter: rallyColors.glassBlur,
                boxShadow: rallyColors.glassShadow,
              }}
            >
              <form onSubmit={handleSubmit}>
                <Stack gap="md">
                  <Box ta="center" mb="xs">
                    <Title order={3} c={rallyColors.textPrimary} mb={4}>ایجاد حساب جدید</Title>
                    <Text size="sm" c={rallyColors.textSecondary}>
                      برای استفاده از امکانات داشبورد ثبت‌نام کنید
                    </Text>
                  </Box>

                  {error && (
                    <Alert
                      icon={<IconAlertCircle size={16} />}
                      color="red"
                      variant="light"
                      radius="md"
                      styles={{ message: { color: rallyColors.red } }}
                    >
                      {error}
                    </Alert>
                  )}

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
                </Stack>
              </form>

              <Divider my="lg" label="یا" labelPosition="center" color={rallyColors.border} />

              <Text ta="center" size="sm" c={rallyColors.textSecondary}>
                قبلا ثبت‌نام کرده‌اید؟{' '}
                <Anchor component={Link} to="/login" c={rallyColors.green} fw={600}>
                  وارد شوید
                </Anchor>
              </Text>
            </Paper>
          </motion.div>

          {/* Back to landing */}
          <motion.div variants={fadeUp}>
            <Text ta="center" size="sm" c={rallyColors.textDimmed} mt="lg">
              <Anchor component={Link} to="/" c={rallyColors.textSecondary} fw={500}>
                بازگشت به صفحه اصلی
              </Anchor>
            </Text>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
}
