import { useNavigate } from 'react-router-dom';
import { Box } from '@mantine/core';
import { IconTrendingUp } from '@tabler/icons-react';
import { motion } from 'motion/react';
import LightRays from './LightRays';
import TrueFocus from '../../landing/components/TrueFocus';
import TextType from './TextType';
import rallyColors from '../../../theme/rallyColors';

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
      {/* ── Left: LightRays + brand ──────────────────────── */}
      <div className="auth-split__left">
        <LightRays
          className="auth-light-rays"
          raysOrigin="top-center"
          raysColor="#A7F3D0"
          raysSpeed={0.55}
          lightSpread={0.65}
          rayLength={1.9}
          pulsating
          fadeDistance={0.9}
          saturation={1.35}
          followMouse
          mouseInfluence={0.12}
          noiseAmount={0.04}
          distortion={0.12}
        />

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
              <IconTrendingUp size={28} color="#fff" stroke={1.8} />
            </Box>
          </motion.div>

          {/* Brand name — TrueFocus */}
          <motion.div variants={leftItem}>
            <TrueFocus
              sentence="فین هاب"
              manualMode={false}
              blurAmount={4}
              borderColor={rallyColors.green}
              glowColor={`rgba(16,185,129,0.55)`}
              animationDuration={0.6}
              pauseBetweenAnimations={1.8}
            />
          </motion.div>

          {/* Typewriter welcome message */}
          <motion.div variants={leftItem}>
            <TextType
              text="به داشبورد سرمایه گذاری خوش آمدید"
              typingSpeed={55}
              pauseDuration={3000}
              loop={false}
              showCursor
              cursorCharacter="|"
              style={{
                fontSize: 'clamp(16px, 1.8vw, 22px)',
                fontWeight: 500,
                color: 'rgba(148,163,184,0.8)',
                direction: 'rtl',
                whiteSpace: 'nowrap',
              }}
            />
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
