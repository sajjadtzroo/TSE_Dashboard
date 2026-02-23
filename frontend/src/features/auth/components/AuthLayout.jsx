import { useNavigate } from 'react-router-dom';
import { Box, Text } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { motion } from 'motion/react';
import LightRays from './LightRays';
import BlurText from './BlurText';
import GradientText from './GradientText';
import rallyColors from '../../../theme/rallyColors';

const AURORA_COLORS = ['#2D0070', '#10B981', '#6D28D9'];

const leftStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const leftItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export default function AuthLayout({ children, tagline = 'داشبورد جامع بازار سرمایه ایران' }) {
  const navigate = useNavigate();

  return (
    <div className="auth-split">
      {/* ── Left: Aurora + brand ─────────────────────────── */}
      <div className="auth-split__left">
        <Aurora colorStops={AURORA_COLORS} amplitude={1.1} blend={0.5} speed={0.8} />

        <motion.div
          className="auth-split__left-content"
          variants={leftStagger}
          initial="hidden"
          animate="show"
        >
          {/* Logo mark */}
          <motion.div variants={leftItem}>
            <Box
              onClick={() => navigate('/')}
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: `0 0 32px ${rallyColors.green}40`,
              }}
            >
              <IconChartBar size={28} color="#fff" stroke={1.8} />
            </Box>
          </motion.div>

          {/* Brand name */}
          <motion.div variants={leftItem}>
            <BlurText
              text="Financial Dashboard"
              direction="bottom"
              delay={160}
              animateBy="words"
              className="auth-blur-heading"
              stepDuration={0.4}
            />
          </motion.div>

          {/* Persian tagline with gradient sweep */}
          <motion.div variants={leftItem}>
            <GradientText
              colors={[rallyColors.green, rallyColors.purple, rallyColors.blue, rallyColors.green]}
              animationSpeed={9}
              style={{ fontSize: 'clamp(13px, 1.4vw, 16px)', fontWeight: 500, direction: 'rtl' }}
            >
              {tagline}
            </GradientText>
          </motion.div>

          {/* Live market badge */}
          <motion.div variants={leftItem}>
            <Box
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 20,
                padding: '5px 14px',
                marginTop: 8,
              }}
            >
              {/* Two-layer pulse: persistent dot + expanding ring */}
              <Box style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }}>
                <Box
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: rallyColors.green,
                    boxShadow: `0 0 6px ${rallyColors.green}`,
                  }}
                />
                <Box
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: rallyColors.green,
                    animation: 'hero-live-ping 2s ease-in-out infinite',
                  }}
                />
              </Box>
              <Text size="xs" c={rallyColors.green} fw={500}>بورس اوراق بهادار تهران</Text>
            </Box>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Right: form panel ────────────────────────────── */}
      <div className="auth-split__right">
        <div className="auth-split__form">
          {children}
        </div>
      </div>
    </div>
  );
}
