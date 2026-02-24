# Auth Pages — Aurora Split-Screen Redesign

**Date:** 2026-02-23
**Scope:** LoginPage.jsx + RegisterPage.jsx
**Status:** Approved for implementation

---

## Goal

Replace the current centered-card login/register pages with a cinematic split-screen layout using React Bits `Aurora` (WebGL) and `BlurText`/`GradientText` (motion/react). No new npm dependencies required (`ogl` and `motion/react` already installed).

---

## Layout

```
┌─────────────────────┬──────────────────────────┐
│   LEFT PANEL 50%    │   RIGHT PANEL 50%         │
│                     │                            │
│  Aurora WebGL bg    │  Solid #0B0E14 bg          │
│                     │                            │
│  [Logo mark]        │  [Logo — mobile only]      │
│                     │                            │
│  Financial          │  BlurText title            │
│  Dashboard          │  Subtitle                  │
│  (BlurText)         │                            │
│                     │  Form fields               │
│  GradientText       │  Submit button             │
│  tagline (Persian)  │                            │
│                     │  Divider                   │
│  Market status      │  Link to other auth page   │
│  footer hint        │  Back to home              │
└─────────────────────┴──────────────────────────┘
```

**Mobile (< 768px):** Left panel collapses to a 180px Aurora strip across the top. Right panel fills remaining height.

---

## Component Map

| React Bits Component | Used for | Props |
|---|---|---|
| `Aurora` | Full-height left panel background | `colorStops: ['#3B0080', '#10B981', '#8B5CF6']`, `amplitude: 1.0`, `blend: 0.5` |
| `BlurText` | Left panel brand heading + right panel form title | `direction: 'bottom'`, `delay: 180`, `animateBy: 'words'` |
| `GradientText` | Left panel Persian tagline | `colors: ['#10B981', '#8B5CF6', '#3B82F6']`, `animationSpeed: 10` |

`BlurText` and `GradientText` are inlined in `LoginPage.jsx` / `RegisterPage.jsx` — no separate component files, keeping footprint minimal.

---

## Shared `AuthLayout` component

Both pages share a common wrapper `AuthLayout.jsx` (new file in `features/auth/components/`) that owns:
- The split-screen flex container
- Aurora left panel
- Brand copy on left (logo, BlurText, GradientText, tagline)
- Responsive mobile strip logic

`LoginPage` and `RegisterPage` provide only their form via `children`.

---

## Aurora Color Stops

```js
['#2D0070', '#10B981', '#6D28D9']
// dark-purple → Rally emerald green → violet
```
These match the Rally palette and feel financial/professional.

---

## Form Panel (right side)

Identical inputs to current implementation. Changes:
- Background: solid `#0B0E14` (no glass, since it's a flat panel — cleaner split)
- Card max-width: `420px`, centered in panel
- Input focus: `outline: 1px solid #10B981` (Rally green ring)
- Submit button: unchanged (`color="rally-green"`)
- BlurText on form title with shorter delay than left panel (fires immediately on mount since it's right-side content)

---

## Animation Sequence (right panel)

```
0ms    — panel fades in (opacity 0→1, 400ms)
100ms  — BlurText title fires (word by word, 180ms stagger)
300ms  — subtitle fades in
450ms  — inputs stagger in (80ms each)
600ms  — button fades in
```

---

## Files

| File | Action |
|---|---|
| `frontend/src/features/auth/components/AuthLayout.jsx` | **CREATE** — shared split wrapper |
| `frontend/src/pages/LoginPage.jsx` | **MODIFY** — use AuthLayout, keep all auth logic |
| `frontend/src/pages/RegisterPage.jsx` | **MODIFY** — use AuthLayout, keep all register logic |

---

## Constraints

- All existing auth logic (`useAuth`, `login`, `register`, `navigate`) unchanged
- RTL preserved for all Persian text (`direction: rtl` on form, `dir="ltr"` on inputs)
- `ogl` and `motion/react` — already installed, no `npm install` needed
- Aurora CSS class `.aurora-container` added to `global.css` (needs `width:100%; height:100%;`)
- GradientText needs `.animated-gradient-text` and `.text-content` CSS — inlined as `<style>` tag or added to `global.css`
