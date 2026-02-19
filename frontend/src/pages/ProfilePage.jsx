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
  Badge,
  Avatar,
  Divider,
} from '@mantine/core';
import {
  IconUser,
  IconLock,
  IconMail,
  IconShield,
  IconAlertCircle,
  IconCheck,
  IconChartBar,
  IconArrowRight,
} from '@tabler/icons-react';
import axios from 'axios';
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

const ROLE_LABELS = {
  admin: { label: 'مدیر', color: 'red' },
  analyst: { label: 'تحلیلگر', color: 'violet' },
  viewer: { label: 'کاربر', color: 'blue' },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  if (loading) return null;

  if (!isAuthenticated) {
    navigate('/login', { replace: true });
    return null;
  }

  const roleInfo = ROLE_LABELS[user?.role] || ROLE_LABELS.viewer;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد.' });
      return;
    }
    setChangingPassword(true);
    setPasswordMsg({ type: '', text: '' });
    try {
      await axios.patch('/api/auth/me', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg({ type: 'success', text: 'رمز عبور با موفقیت تغییر کرد.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setPasswordMsg({ type: 'error', text: detail || 'خطا در تغییر رمز عبور.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <Box
      className="landing-bg"
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      <div className="landing-dot-grid" />

      <Box
        style={{
          position: 'absolute',
          top: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rallyColors.blue}10 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <Container size={520} style={{ position: 'relative', zIndex: 1 }} py={100}>
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

          {/* Profile Info Card */}
          <motion.div variants={fadeUp}>
            <Paper
              radius="lg"
              p="xl"
              mb="md"
              style={{
                backgroundColor: rallyColors.glassBg,
                border: `1px solid ${rallyColors.glassBorder}`,
                backdropFilter: rallyColors.glassBlur,
                boxShadow: rallyColors.glassShadow,
              }}
            >
              <Group gap="md" align="flex-start">
                <Avatar
                  size={56}
                  radius="md"
                  color="rally-green"
                  styles={{ root: { fontWeight: 700, fontSize: 22 } }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </Avatar>
                <Box style={{ flex: 1 }}>
                  <Group gap="sm" align="center" mb={4}>
                    <Title order={4} c={rallyColors.textPrimary}>{user?.username}</Title>
                    <Badge variant="light" color={roleInfo.color} size="sm">
                      {roleInfo.label}
                    </Badge>
                  </Group>
                  <Group gap="xs" c={rallyColors.textSecondary}>
                    <IconMail size={14} />
                    <Text size="sm">{user?.email}</Text>
                  </Group>
                </Box>
              </Group>

              <Divider my="lg" color={rallyColors.border} />

              <Group gap="xs">
                <Button
                  variant="light"
                  color="rally-green"
                  radius="md"
                  leftSection={<IconArrowRight size={16} />}
                  onClick={() => navigate('/dashboard')}
                >
                  رفتن به داشبورد
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  radius="md"
                  onClick={handleLogout}
                >
                  خروج از حساب
                </Button>
              </Group>
            </Paper>
          </motion.div>

          {/* Change Password Card */}
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
              <Group gap="xs" mb="md">
                <IconShield size={20} color={rallyColors.blue} />
                <Title order={5} c={rallyColors.textPrimary}>تغییر رمز عبور</Title>
              </Group>

              <form onSubmit={handlePasswordChange}>
                <Stack gap="md">
                  {passwordMsg.text && (
                    <Alert
                      icon={passwordMsg.type === 'success' ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
                      color={passwordMsg.type === 'success' ? 'green' : 'red'}
                      variant="light"
                      radius="md"
                    >
                      {passwordMsg.text}
                    </Alert>
                  )}

                  <PasswordInput
                    label="رمز عبور فعلی"
                    placeholder="********"
                    leftSection={<IconLock size={16} />}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                    required
                    radius="md"
                    size="md"
                    autoComplete="current-password"
                    dir="ltr"
                    styles={{ input: { textAlign: 'left' } }}
                  />

                  <PasswordInput
                    label="رمز عبور جدید"
                    placeholder="حداقل ۸ کاراکتر"
                    leftSection={<IconLock size={16} />}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.currentTarget.value)}
                    required
                    radius="md"
                    size="md"
                    autoComplete="new-password"
                    dir="ltr"
                    styles={{ input: { textAlign: 'left' } }}
                  />

                  <Button
                    type="submit"
                    variant="light"
                    color="blue"
                    radius="md"
                    loading={changingPassword}
                    leftSection={<IconCheck size={16} />}
                  >
                    تغییر رمز عبور
                  </Button>
                </Stack>
              </form>
            </Paper>
          </motion.div>

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
