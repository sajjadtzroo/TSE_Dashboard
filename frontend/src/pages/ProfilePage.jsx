import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Box,
  Container,
  Paper,
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
  Progress,
  SimpleGrid,
  UnstyledButton,
  ThemeIcon,
  Indicator,
  ActionIcon,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconUser,
  IconLock,
  IconMail,
  IconShield,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconChartBar,
  IconArrowRight,
  IconCoin,
  IconBuildingBank,
  IconBriefcase,
  IconSun,
  IconMoon,
  IconLogout,
  IconCalendar,
  IconId,
  IconCircleCheck,
} from '@tabler/icons-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import rallyColors from '../theme/rallyColors';
import { toJalali } from '../utils/dateUtils';
import {
  getPasswordStrength,
  STRENGTH_COLORS,
  STRENGTH_LABELS,
  PASSWORD_REQUIREMENTS,
} from '../utils/passwordStrength';

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

const ROLE_DESCRIPTIONS = {
  admin: 'شما دسترسی کامل به تمام بخش‌ها از جمله مدیریت اسکرپر و کش دارید.',
  analyst: 'شما امکان آپلود اسناد و استفاده از تحلیل‌های پیشرفته را دارید.',
  viewer: 'شما به داده‌های بازار و چت هوشمند دسترسی دارید.',
};

const NAV_ITEMS = [
  { label: 'بازار ایران', to: '/dashboard', color: rallyColors.green, icon: IconChartBar },
  { label: 'رمزارزها', to: '/crypto', color: rallyColors.yellow, icon: IconCoin },
  { label: 'تسهیلات', to: '/loans', color: rallyColors.purple, icon: IconBuildingBank },
  { label: 'پورتفولیو', to: '/portfolio', color: rallyColors.blue, icon: IconBriefcase },
];

const glassStyle = {
  backgroundColor: rallyColors.glassBg,
  border: `1px solid ${rallyColors.glassBorder}`,
  backdropFilter: rallyColors.glassBlur,
  boxShadow: rallyColors.glassShadow,
};

function formatMemberDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return toJalali(iso);
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  if (loading) return null;

  if (!isAuthenticated) {
    navigate('/login', { replace: true });
    return null;
  }

  const roleInfo = ROLE_LABELS[user?.role] || ROLE_LABELS.viewer;
  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = strength >= 2 && passwordsMatch && currentPassword.length > 0;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
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
      setConfirmPassword('');
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

  const toggleTheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
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

      <Container size={680} style={{ position: 'relative', zIndex: 1 }} py={60}>
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

          {/* Card 1: Profile Identity */}
          <motion.div variants={fadeUp}>
            <Paper radius="lg" p="xl" mb="md" style={glassStyle}>
              <Group gap="md" align="flex-start">
                <Indicator inline processing color="green" size={14} offset={5} position="bottom-end">
                  <Avatar
                    size={72}
                    radius="md"
                    color="rally-green"
                    styles={{ root: { fontWeight: 700, fontSize: 28 } }}
                  >
                    {user?.username?.[0]?.toUpperCase()}
                  </Avatar>
                </Indicator>
                <Box style={{ flex: 1 }}>
                  <Group gap="sm" align="center" mb={4}>
                    <Title order={3} c={rallyColors.textPrimary}>{user?.username}</Title>
                    <Badge variant="light" color={roleInfo.color} size="sm">
                      {roleInfo.label}
                    </Badge>
                    <Badge variant="dot" color="green" size="sm">فعال</Badge>
                  </Group>
                  <Group gap="xs" c={rallyColors.textSecondary} mb={4}>
                    <IconMail size={14} />
                    <Text size="sm">{user?.email}</Text>
                  </Group>
                  {user?.created_at && (
                    <Group gap="xs" c={rallyColors.textDimmed}>
                      <IconCalendar size={14} />
                      <Text size="xs">عضویت از {formatMemberDate(user.created_at)}</Text>
                    </Group>
                  )}
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
                <ActionIcon
                  variant="light"
                  color="gray"
                  radius="md"
                  size="lg"
                  onClick={toggleTheme}
                  title={colorScheme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
                >
                  {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                </ActionIcon>
                <Button
                  variant="subtle"
                  color="red"
                  radius="md"
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                >
                  خروج از حساب
                </Button>
              </Group>
            </Paper>
          </motion.div>

          {/* Card 2: Account Details */}
          <motion.div variants={fadeUp}>
            <Paper radius="lg" p="xl" mb="md" style={glassStyle}>
              <Group gap="xs" mb="lg">
                <IconShield size={20} color={rallyColors.blue} />
                <Title order={5} c={rallyColors.textPrimary}>اطلاعات حساب</Title>
              </Group>

              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs" c={rallyColors.textSecondary}>
                    <IconId size={16} />
                    <Text size="sm">شناسه کاربری</Text>
                  </Group>
                  <Text size="sm" c={rallyColors.textPrimary} fw={500} dir="ltr">{user?.id}</Text>
                </Group>

                <Group justify="space-between">
                  <Group gap="xs" c={rallyColors.textSecondary}>
                    <IconUser size={16} />
                    <Text size="sm">نقش</Text>
                  </Group>
                  <Badge variant="light" color={roleInfo.color} size="sm">{roleInfo.label}</Badge>
                </Group>

                <Group justify="space-between">
                  <Group gap="xs" c={rallyColors.textSecondary}>
                    <IconCircleCheck size={16} />
                    <Text size="sm">وضعیت حساب</Text>
                  </Group>
                  <Badge variant="dot" color={user?.is_active ? 'green' : 'red'} size="sm">
                    {user?.is_active ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </Group>

                <Group justify="space-between">
                  <Group gap="xs" c={rallyColors.textSecondary}>
                    <IconCalendar size={16} />
                    <Text size="sm">تاریخ عضویت</Text>
                  </Group>
                  <Text size="sm" c={rallyColors.textPrimary} fw={500} dir="ltr">
                    {formatMemberDate(user?.created_at)}
                  </Text>
                </Group>
              </Stack>

              <Alert
                variant="light"
                color={roleInfo.color}
                radius="md"
                mt="md"
                icon={<IconShield size={16} />}
              >
                <Text size="xs">{ROLE_DESCRIPTIONS[user?.role] || ROLE_DESCRIPTIONS.viewer}</Text>
              </Alert>
            </Paper>
          </motion.div>

          {/* Card 3: Quick Navigation */}
          <motion.div variants={fadeUp}>
            <Paper radius="lg" p="xl" mb="md" style={glassStyle}>
              <Group gap="xs" mb="lg">
                <IconArrowRight size={20} color={rallyColors.green} />
                <Title order={5} c={rallyColors.textPrimary}>دسترسی سریع</Title>
              </Group>

              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                {NAV_ITEMS.map((item) => (
                  <UnstyledButton
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: `1px solid ${rallyColors.glassBorder}`,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    styles={{
                      root: {
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          boxShadow: `0 0 20px ${item.color}15`,
                          borderColor: `${item.color}30`,
                        },
                      },
                    }}
                  >
                    <Stack align="center" gap={8}>
                      <ThemeIcon
                        variant="light"
                        size="lg"
                        radius="md"
                        color={item.color}
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <item.icon size={20} />
                      </ThemeIcon>
                      <Text size="sm" c={rallyColors.textPrimary} fw={500}>
                        {item.label}
                      </Text>
                    </Stack>
                  </UnstyledButton>
                ))}
              </SimpleGrid>
            </Paper>
          </motion.div>

          {/* Card 4: Security — Password Change */}
          <motion.div variants={fadeUp}>
            <Paper radius="lg" p="xl" style={glassStyle}>
              <Group gap="xs" mb="md">
                <IconLock size={20} color={rallyColors.blue} />
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

                  <Box>
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
                    {newPassword.length > 0 && (
                      <Box mt={6}>
                        <Progress
                          value={(strength / 4) * 100}
                          size="xs"
                          radius="xl"
                          color={STRENGTH_COLORS[strength]}
                        />
                        <Text size="xs" c={rallyColors.textDimmed} mt={2}>
                          {STRENGTH_LABELS[strength]}
                        </Text>
                      </Box>
                    )}
                  </Box>

                  {/* Requirements checklist */}
                  {newPassword.length > 0 && (
                    <Stack gap={4}>
                      {PASSWORD_REQUIREMENTS.map((req) => {
                        const passed = req.test(newPassword);
                        return (
                          <Group key={req.label} gap="xs">
                            {passed
                              ? <IconCheck size={14} color={rallyColors.green} />
                              : <IconX size={14} color={rallyColors.textDimmed} />
                            }
                            <Text size="xs" c={passed ? rallyColors.green : rallyColors.textDimmed}>
                              {req.label}
                            </Text>
                          </Group>
                        );
                      })}
                    </Stack>
                  )}

                  <PasswordInput
                    label="تکرار رمز عبور جدید"
                    placeholder="رمز عبور را مجددا وارد کنید"
                    leftSection={<IconLock size={16} />}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    required
                    radius="md"
                    size="md"
                    autoComplete="new-password"
                    dir="ltr"
                    styles={{ input: { textAlign: 'left' } }}
                    error={
                      confirmPassword.length > 0 && !passwordsMatch
                        ? 'رمزهای عبور مطابقت ندارند'
                        : undefined
                    }
                  />

                  <Button
                    type="submit"
                    variant="light"
                    color="blue"
                    radius="md"
                    loading={changingPassword}
                    disabled={!canSubmit}
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
