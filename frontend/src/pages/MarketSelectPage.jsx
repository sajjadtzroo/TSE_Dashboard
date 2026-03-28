import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Text, Badge, Box } from '@mantine/core';
import {
  IconChartBar,
  IconCurrencyBitcoin,
  IconCoins,
  IconBuildingBank,
  IconArrowLeft,
  IconLock,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import rallyColors from '../theme/rallyColors';
import AuthLayout from '../features/auth/components/AuthLayout';
import BlurText from '../features/auth/components/BlurText';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const markets = [
  {
    key: 'stock',
    label: 'بازار سهام',
    sublabel: 'بورس تهران · فرابورس · آپشن · IME',
    icon: IconChartBar,
    color: rallyColors.primary,
    glow: 'rgba(41,98,255,0.22)',
    border: 'rgba(41,98,255,0.35)',
    href: '/dashboard',
    available: true,
  },
  {
    key: 'crypto',
    label: 'ارزهای دیجیتال',
    sublabel: 'Bitcoin · Ethereum · آپشن · فیوچرز',
    icon: IconCurrencyBitcoin,
    color: rallyColors.yellow,
    glow: 'rgba(245,158,11,0.18)',
    border: 'rgba(245,158,11,0.30)',
    href: '/crypto',
    available: true,
  },
  {
    key: 'gold',
    label: 'طلا و ارز',
    sublabel: 'به زودی',
    icon: IconCoins,
    color: rallyColors.textDimmed,
    glow: 'transparent',
    border: 'rgba(42,46,62,0.4)',
    href: null,
    available: false,
  },
  {
    key: 'persian-loan',
    label: 'وام‌یار',
    sublabel: 'مشاور هوشمند تسهیلات · رتبه‌بندی اعتباری',
    icon: IconBuildingBank,
    color: '#0D9488',
    glow: 'rgba(13,148,136,0.18)',
    border: 'rgba(13,148,136,0.30)',
    href: '/persian-loan',
    available: true,
  },
];

export default function MarketSelectPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <AuthLayout tagline="داشبورد جامع بازار سرمایه ایران">
      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Title */}
        <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
          <BlurText
            text="انتخاب بازار"
            direction="bottom"
            delay={80}
            animateBy="words"
            stepDuration={0.3}
            className="auth-form-title"
          />
          <Text size="sm" c={rallyColors.textSecondary} mt={6} style={{ direction: 'rtl' }}>
            کدام بازار را می‌خواهید بررسی کنید؟
          </Text>
        </motion.div>

        {/* Market cards */}
        <motion.div variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {markets.map((m) => {
            const Icon = m.icon;
            return (
              <motion.div key={m.key} variants={fadeUp}>
                <motion.button
                  onClick={() => m.available && navigate(m.href)}
                  whileHover={m.available ? { scale: 1.015, y: -2 } : {}}
                  whileTap={m.available ? { scale: 0.98 } : {}}
                  style={{
                    width: '100%',
                    background: m.available
                      ? `linear-gradient(135deg, ${m.glow} 0%, rgba(26,29,46,0.7) 100%)`
                      : 'rgba(26,29,46,0.4)',
                    border: `1px solid ${m.border}`,
                    borderRadius: 14,
                    padding: '18px 20px',
                    cursor: m.available ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    backdropFilter: 'blur(12px)',
                    transition: 'box-shadow 0.2s',
                    boxShadow: m.available ? `0 0 0 0 ${m.glow}` : 'none',
                    opacity: m.available ? 1 : 0.5,
                    textAlign: 'right',
                    direction: 'rtl',
                  }}
                >
                  {/* Icon box */}
                  <Box
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: m.available ? `${m.glow}` : 'rgba(42,46,62,0.3)',
                      border: `1px solid ${m.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {m.available
                      ? <Icon size={24} color={m.color} stroke={1.8} />
                      : <IconLock size={20} color={rallyColors.textDimmed} stroke={1.5} />
                    }
                  </Box>

                  {/* Labels */}
                  <div style={{ flex: 1 }}>
                    <Text
                      fw={600}
                      size="md"
                      c={m.available ? rallyColors.textPrimary : rallyColors.textDimmed}
                      style={{ lineHeight: 1.3 }}
                    >
                      {m.label}
                    </Text>
                    <Text size="xs" c={rallyColors.textDimmed} mt={2}>
                      {m.sublabel}
                    </Text>
                  </div>

                  {/* Arrow or badge */}
                  {m.available ? (
                    <IconArrowLeft
                      size={18}
                      color={m.color}
                      stroke={2}
                      style={{ flexShrink: 0, opacity: 0.7 }}
                    />
                  ) : (
                    <Badge
                      size="xs"
                      variant="light"
                      color="gray"
                      style={{ flexShrink: 0 }}
                    >
                      به زودی
                    </Badge>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
}
