import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Text, Badge, Box } from '@mantine/core';
import {
  IconChartBar,
  IconCurrencyBitcoin,
  IconCoins,
  IconBuildingBank,
  IconBriefcase,
  IconFlame,
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
    sublabel: null,
    icon: IconChartBar,
    color: rallyColors.primary,
    glow: 'rgba(41,98,255,0.22)',
    border: 'rgba(41,98,255,0.35)',
    href: '/dashboard',
    available: true,
    toolCount: '۶۰+ ابزار',
    features: ['تحلیل تکنیکال', 'نقشه بازار', 'اختیار معامله', 'بورس کالا'],
  },
  {
    key: 'crypto',
    label: 'ارزهای دیجیتال',
    sublabel: null,
    icon: IconCurrencyBitcoin,
    color: rallyColors.yellow,
    glow: 'rgba(245,158,11,0.18)',
    border: 'rgba(245,158,11,0.30)',
    href: '/crypto',
    available: true,
    toolCount: '۱۳ ابزار',
    features: ['آپشن', 'فیوچرز', 'مقایسه', 'نقشه بازار'],
  },
  {
    key: 'loans',
    label: 'تسهیلات بانکی',
    sublabel: null,
    icon: IconBuildingBank,
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,0.18)',
    border: 'rgba(139,92,246,0.30)',
    href: '/loans',
    available: true,
    toolCount: '۱۰+ ابزار',
    features: ['وام‌یار', 'بانک‌ها', 'مقایسه وام', 'ماشین‌حساب'],
  },
  {
    key: 'commodity',
    label: 'بازار کالا',
    sublabel: null,
    icon: IconFlame,
    color: '#EA580C',
    glow: 'rgba(234,88,12,0.18)',
    border: 'rgba(234,88,12,0.30)',
    href: '/commodity',
    available: true,
    toolCount: '۶ ابزار',
    features: ['نفت و انرژی', 'فلزات', 'کشاورزی', 'نقشه بازار'],
  },
  {
    key: 'portfolio',
    label: 'سبد سرمایه‌گذاری',
    sublabel: null,
    icon: IconBriefcase,
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.18)',
    border: 'rgba(59,130,246,0.30)',
    href: '/portfolio',
    available: true,
    toolCount: '۵ ابزار',
    features: ['عملکرد', 'تحلیل ریسک', 'شبیه‌سازی'],
  },
  {
    key: 'gold',
    label: 'طلا و ارز',
    sublabel: null,
    icon: IconCoins,
    color: rallyColors.textDimmed,
    glow: 'transparent',
    border: 'rgba(42,46,62,0.4)',
    href: null,
    available: false,
    toolCount: null,
    features: [],
  },
];

export default function MarketSelectPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [hoveredKey, setHoveredKey] = useState(null);

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
        <motion.div variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {markets.map((m) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.key}
                variants={fadeUp}
                onMouseEnter={() => m.available && setHoveredKey(m.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <motion.button
                  onClick={() => m.available && navigate(m.href)}
                  whileHover={m.available ? { scale: 1.01 } : {}}
                  whileTap={m.available ? { scale: 0.98 } : {}}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(255,255,255,0.07)`,
                    borderRadius: 16,
                    padding: '16px 18px',
                    cursor: m.available ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
                    boxShadow: 'none',
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
                      border: `1px solid ${m.available ? m.border : 'rgba(255,255,255,0.07)'}`,
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
                    {m.sublabel && (
                      <Text size="xs" c={rallyColors.textDimmed} mt={2}>
                        {m.sublabel}
                      </Text>
                    )}
                    {m.toolCount && (
                      <Text
                        size="xs"
                        fw={600}
                        mt={4}
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 60,
                          background: `${m.color}15`,
                          color: m.color,
                          fontSize: 11,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {m.toolCount}
                      </Text>
                    )}
                    <AnimatePresence>
                      {hoveredKey === m.key && m.features.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <Text
                            size="xs"
                            c={rallyColors.textSecondary}
                            mt={6}
                            style={{ lineHeight: 1.6 }}
                          >
                            {m.features.join(' · ')}
                          </Text>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
