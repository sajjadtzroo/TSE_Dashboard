# Auth Pages — Aurora Split-Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild `LoginPage.jsx` and `RegisterPage.jsx` with a split-screen layout — Aurora WebGL on the left with brand copy, clean dark form panel on the right — using React Bits components (`Aurora`, `BlurText`, `GradientText`).

**Architecture:** A new `AuthLayout` component owns the split-screen shell (Aurora left, dark right). `LoginPage` and `RegisterPage` pass their forms as `children` and a `leftContent` prop. `BlurText` and `GradientText` are inlined from React Bits source — no separate package needed.

**Tech Stack:** React 18, motion/react (already installed), ogl (already installed at ^1.0.11), Mantine v7, react-router-dom.

---

## Critical Files

| File | Action |
|------|---------|
| `frontend/src/features/auth/components/AuthLayout.jsx` | **CREATE** — split-screen wrapper |
| `frontend/src/features/auth/components/BlurText.jsx` | **CREATE** — React Bits BlurText (motion/react) |
| `frontend/src/features/auth/components/GradientText.jsx` | **CREATE** — React Bits GradientText (motion/react) |
| `frontend/src/features/auth/components/Aurora.jsx` | **CREATE** — React Bits Aurora (ogl WebGL) |
| `frontend/src/pages/LoginPage.jsx` | **MODIFY** — use AuthLayout, keep all auth logic |
| `frontend/src/pages/RegisterPage.jsx` | **MODIFY** — use AuthLayout, keep all auth logic |
| `frontend/src/global.css` | **MODIFY** — add Aurora + GradientText + auth-panel CSS |

---

## Task 1: Create `BlurText.jsx`

**File:** `frontend/src/features/auth/components/BlurText.jsx`

Inlined directly from React Bits. Uses `motion/react` which is already installed.

```jsx
import { motion } from 'motion/react';
import { useEffect, useRef, useState, useMemo } from 'react';

const buildKeyframes = (from, steps) => {
  const keys = new Set([...Object.keys(from), ...steps.flatMap(s => Object.keys(s))]);
  const keyframes = {};
  keys.forEach(k => { keyframes[k] = [from[k], ...steps.map(s => s[k])]; });
  return keyframes;
};

export default function BlurText({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom,
  animationTo,
  easing = t => t,
  onAnimationComplete,
  stepDuration = 0.35,
}) {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(ref.current); } },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () => direction === 'top' ? { filter: 'blur(10px)', opacity: 0, y: -40 } : { filter: 'blur(10px)', opacity: 0, y: 40 },
    [direction]
  );
  const defaultTo = useMemo(() => [
    { filter: 'blur(5px)', opacity: 0.5, y: direction === 'top' ? 5 : -5 },
    { filter: 'blur(0px)', opacity: 1, y: 0 },
  ], [direction]);

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) => stepCount === 1 ? 0 : i / (stepCount - 1));

  return (
    <p ref={ref} className={className} style={{ display: 'flex', flexWrap: 'wrap', margin: 0, padding: 0 }}>
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);
        return (
          <motion.span
            key={index}
            style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={{ duration: totalDuration, times, delay: (index * delay) / 1000, ease: easing }}
            onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
          >
            {segment === ' ' ? '\u00A0' : segment}
            {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
          </motion.span>
        );
      })}
    </p>
  );
}
```

**Verify:** No errors, no imports missing.

**Commit:**
```bash
git add frontend/src/features/auth/components/BlurText.jsx
git commit -m "feat(auth): add BlurText component from React Bits"
```

---

## Task 2: Create `GradientText.jsx`

**File:** `frontend/src/features/auth/components/GradientText.jsx`

Inlined from React Bits. CSS is applied via inline styles to avoid a separate `.css` file.

```jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useAnimationFrame, useTransform } from 'motion/react';

export default function GradientText({
  children,
  className = '',
  colors = ['#10B981', '#8B5CF6', '#3B82F6'],
  animationSpeed = 8,
  direction = 'horizontal',
  pauseOnHover = false,
  yoyo = true,
  style = {},
}) {
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef(null);
  const animationDuration = animationSpeed * 1000;

  useAnimationFrame(time => {
    if (isPaused) { lastTimeRef.current = null; return; }
    if (lastTimeRef.current === null) { lastTimeRef.current = time; return; }
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += delta;
    if (yoyo) {
      const full = animationDuration * 2;
      const t = elapsedRef.current % full;
      progress.set(t < animationDuration ? (t / animationDuration) * 100 : 100 - ((t - animationDuration) / animationDuration) * 100);
    } else {
      progress.set((elapsedRef.current / animationDuration) * 100);
    }
  });

  useEffect(() => { elapsedRef.current = 0; progress.set(0); }, [animationSpeed, progress, yoyo]);

  const gradientColors = [...colors, colors[0]].join(', ');
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${gradientColors})`,
    backgroundSize: '300% 100%',
    backgroundRepeat: 'repeat',
  };
  const backgroundPosition = useTransform(progress, p => `${p}% 50%`);

  return (
    <motion.div
      className={className}
      style={{ display: 'inline-block', ...style }}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <motion.span style={{
        ...gradientStyle,
        backgroundPosition,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent',
        display: 'inline-block',
      }}>
        {children}
      </motion.span>
    </motion.div>
  );
}
```

**Commit:**
```bash
git add frontend/src/features/auth/components/GradientText.jsx
git commit -m "feat(auth): add GradientText component from React Bits"
```

---

## Task 3: Create `Aurora.jsx`

**File:** `frontend/src/features/auth/components/Aurora.jsx`

Inlined from React Bits verbatim. Uses `ogl` (already in package.json at ^1.0.11). The CSS class `.aurora-container` is added in Task 4.

```jsx
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
out vec4 fragColor;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop { vec3 color; float position; };

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                              \
  for (int i = 0; i < 2; i++) {                               \
    ColorStop currentColor = colors[i];                       \
    bool isInBetween = currentColor.position <= factor;       \
    index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                           \
  ColorStop currentColor = colors[index];                     \
  ColorStop nextColor = colors[index + 1];                    \
  float range = nextColor.position - currentColor.position;   \
  float lerpFactor = (factor - currentColor.position) / range;\
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  vec3 auroraColor = intensity * rampColor;
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}`;

export default function Aurora({ colorStops = ['#2D0070', '#10B981', '#6D28D9'], amplitude = 1.0, blend = 0.5, speed = 1.0 }) {
  const propsRef = useRef({ colorStops, amplitude, blend, speed });
  propsRef.current = { colorStops, amplitude, blend, speed };
  const ctnDom = useRef(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;
    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = 'transparent';

    let program;
    function resize() {
      if (!ctn) return;
      renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
      if (program) program.uniforms.uResolution.value = [ctn.offsetWidth, ctn.offsetHeight];
    }
    window.addEventListener('resize', resize);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;

    program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStops.map(hex => { const c = new Color(hex); return [c.r, c.g, c.b]; }) },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uBlend: { value: blend },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctn.appendChild(gl.canvas);

    let animId = 0;
    const update = t => {
      animId = requestAnimationFrame(update);
      const p = propsRef.current;
      program.uniforms.uTime.value = t * 0.001 * (p.speed ?? 1.0);
      program.uniforms.uAmplitude.value = p.amplitude ?? 1.0;
      program.uniforms.uBlend.value = p.blend ?? 0.5;
      program.uniforms.uColorStops.value = (p.colorStops ?? colorStops).map(hex => { const c = new Color(hex); return [c.r, c.g, c.b]; });
      renderer.render({ scene: mesh });
    };
    animId = requestAnimationFrame(update);
    resize();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (ctn && gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ctnDom} className="aurora-container" />;
}
```

**Commit:**
```bash
git add frontend/src/features/auth/components/Aurora.jsx
git commit -m "feat(auth): add Aurora WebGL component from React Bits"
```

---

## Task 4: Add CSS to `global.css`

**File:** `frontend/src/global.css`

Append after the existing FlowingMenu block (before the `prefers-reduced-motion` block):

```css
/* ── Auth Split-Screen ──────────────────────────────────────── */
.aurora-container {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
.aurora-container canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.auth-split {
  display: flex;
  min-height: 100vh;
  background: #0B0E14;
}

/* Left: Aurora panel */
.auth-split__left {
  position: relative;
  width: 50%;
  overflow: hidden;
  background: #060810;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  gap: 24px;
}

/* Subtle dark vignette over Aurora so text is readable */
.auth-split__left::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(6,8,16,0.45) 0%,
    rgba(6,8,16,0.15) 50%,
    rgba(6,8,16,0.55) 100%
  );
  pointer-events: none;
  z-index: 1;
}

.auth-split__left-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
  max-width: 360px;
}

/* Right: form panel */
.auth-split__right {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  background: #0B0E14;
  border-left: 1px solid rgba(255,255,255,0.06);
}

.auth-split__form {
  width: 100%;
  max-width: 400px;
}

/* Mobile: left panel becomes a top strip */
@media (max-width: 768px) {
  .auth-split { flex-direction: column; }
  .auth-split__left {
    width: 100%;
    height: 200px;
    padding: 24px 20px;
    flex-shrink: 0;
  }
  .auth-split__right {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 32px 20px;
    justify-content: flex-start;
  }
}
```

**Commit:**
```bash
git add frontend/src/global.css
git commit -m "style(auth): add Aurora + auth split-screen CSS"
```

---

## Task 5: Create `AuthLayout.jsx`

**File:** `frontend/src/features/auth/components/AuthLayout.jsx`

Owns the full split-screen shell. Accepts `children` (the form) and left-panel content as props.

```jsx
import { useNavigate } from 'react-router-dom';
import { Box, Text, Group } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { motion } from 'motion/react';
import Aurora from './Aurora';
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

          {/* Market hint badge */}
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
              <Box
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: rallyColors.green,
                  boxShadow: `0 0 6px ${rallyColors.green}`,
                  animation: 'hero-live-ping 2s ease-in-out infinite',
                }}
              />
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
```

Also add this CSS rule to `global.css` inside the auth block (after `.auth-split__form`):

```css
/* BlurText heading size inside auth left panel */
.auth-blur-heading {
  font-size: clamp(22px, 2.5vw, 32px);
  font-weight: 800;
  color: #F1F5F9;
  letter-spacing: -0.03em;
  line-height: 1.15;
  justify-content: center;
}
```

**Commit:**
```bash
git add frontend/src/features/auth/components/AuthLayout.jsx frontend/src/global.css
git commit -m "feat(auth): add AuthLayout split-screen shell with Aurora"
```

---

## Task 6: Rewrite `LoginPage.jsx`

**File:** `frontend/src/pages/LoginPage.jsx`

Keep ALL existing auth logic (`useAuth`, `login`, `navigate`, error handling). Replace only the shell/layout.

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Alert,
  Anchor,
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
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
              <motion.div variants={fadeUp}>
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
                size="md"
                radius="md"
                loading={submitting}
                color="rally-green"
                mt="xs"
              >
                ورود
              </Button>
            </motion.div>
          </Stack>
        </form>

        <motion.div variants={fadeUp}>
          <Divider my="lg" label="یا" labelPosition="center" color={rallyColors.border} />
          <Text ta="center" size="sm" c={rallyColors.textSecondary} style={{ direction: 'rtl' }}>
            حساب ندارید؟{' '}
            <Anchor component={Link} to="/register" c={rallyColors.green} fw={600}>
              ثبت‌نام کنید
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
```

Also add to `global.css` inside the auth block:

```css
.auth-form-title {
  font-size: clamp(22px, 2.2vw, 28px);
  font-weight: 700;
  color: #F1F5F9;
  letter-spacing: -0.025em;
  direction: rtl;
}
```

**Commit:**
```bash
git add frontend/src/pages/LoginPage.jsx frontend/src/global.css
git commit -m "feat(auth): rebuild LoginPage with Aurora split-screen layout"
```

---

## Task 7: Rewrite `RegisterPage.jsx`

**File:** `frontend/src/pages/RegisterPage.jsx`

Keep ALL existing auth logic (`useAuth`, `register`, `login`, `navigate`, password strength, error handling). Replace only shell/layout.

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
              <motion.div variants={fadeUp}>
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
                required radius="md" size="md"
                autoComplete="username" dir="ltr"
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
                required radius="md" size="md"
                type="email" autoComplete="email" dir="ltr"
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
                  required radius="md" size="md"
                  autoComplete="new-password" dir="ltr"
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
                type="submit" fullWidth size="md" radius="md"
                loading={submitting} color="rally-green" mt="xs"
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
```

**Commit:**
```bash
git add frontend/src/pages/RegisterPage.jsx
git commit -m "feat(auth): rebuild RegisterPage with Aurora split-screen layout"
```

---

## Task 8: Build verification

```bash
cd frontend && npm run build
```

Expected: `✓ built in X.XXs` with no errors. The `LoginPage` and `RegisterPage` chunks should each be under 20 kB.

If build fails, check:
- `ogl` imports in `Aurora.jsx` — `Renderer, Program, Mesh, Color, Triangle` must all be named exports from `ogl`
- `motion/react` imports — `useMotionValue, useAnimationFrame, useTransform` must exist

**Final commit:**
```bash
git add -A
git commit -m "chore: verify Aurora auth pages build"
```
