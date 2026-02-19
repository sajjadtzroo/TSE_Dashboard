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
} from '@mantine/core';
import { IconUser, IconLock, IconAlertCircle, IconChartBar } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import rallyColors from '../theme/rallyColors';

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(msg || 'خطا در ورود. لطفا دوباره تلاش کنید.');
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
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rallyColors.green}12 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <Container size={440} style={{ position: 'relative', zIndex: 1, width: '100%' }}>
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
                    <Title order={3} c={rallyColors.textPrimary} mb={4}>ورود به حساب</Title>
                    <Text size="sm" c={rallyColors.textSecondary}>
                      برای دسترسی به داشبورد وارد شوید
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

                  <Button
                    type="submit"
                    fullWidth
                    size="md"
                    radius="md"
                    loading={submitting}
                    color="rally-green"
                    mt="xs"
                  >
                    ورود
                  </Button>
                </Stack>
              </form>

              <Divider my="lg" label="یا" labelPosition="center" color={rallyColors.border} />

              <Text ta="center" size="sm" c={rallyColors.textSecondary}>
                حساب ندارید؟{' '}
                <Anchor component={Link} to="/register" c={rallyColors.green} fw={600}>
                  ثبت‌نام کنید
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
