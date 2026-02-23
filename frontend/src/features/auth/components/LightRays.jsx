import { useRef, useEffect, useState } from 'react';
import { Renderer, Program, Triangle, Mesh } from 'ogl';

const hexToRgb = hex => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const getAnchorAndDir = (origin, w, h) => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left':   return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right':  return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left':       return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right':      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left':   return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center': return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right':  return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default:           return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

export default function LightRays({
  raysOrigin    = 'top-center',
  raysColor     = '#ffffff',
  raysSpeed     = 1,
  lightSpread   = 1,
  rayLength     = 2,
  pulsating     = false,
  fadeDistance  = 1.0,
  saturation    = 1.0,
  followMouse   = true,
  mouseInfluence = 0.1,
  noiseAmount   = 0.0,
  distortion    = 0.0,
  className     = '',
}) {
  const containerRef    = useRef(null);
  const uniformsRef     = useRef(null);
  const rendererRef     = useRef(null);
  const mouseRef        = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef  = useRef({ x: 0.5, y: 0.5 });
  const animationIdRef  = useRef(null);
  const meshRef         = useRef(null);
  const cleanupRef      = useRef(null);
  const observerRef     = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    observerRef.current = new IntersectionObserver(entries => {
      setIsVisible(entries[0].isIntersecting);
    }, { threshold: 0.1 });
    observerRef.current.observe(containerRef.current);
    return () => { observerRef.current?.disconnect(); observerRef.current = null; };
  }, []);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;
    cleanupRef.current?.();
    cleanupRef.current = null;

    const init = async () => {
      if (!containerRef.current) return;
      await new Promise(r => setTimeout(r, 10));
      if (!containerRef.current) return;

      const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
      rendererRef.current = renderer;
      const gl = renderer.gl;
      gl.canvas.style.width  = '100%';
      gl.canvas.style.height = '100%';
      while (containerRef.current.firstChild) containerRef.current.removeChild(containerRef.current.firstChild);
      containerRef.current.appendChild(gl.canvas);

      const vert = `attribute vec2 position; varying vec2 vUv;
void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;

      const frag = `precision highp float;
uniform float iTime; uniform vec2 iResolution;
uniform vec2 rayPos; uniform vec2 rayDir; uniform vec3 raysColor;
uniform float raysSpeed; uniform float lightSpread; uniform float rayLength;
uniform float pulsating; uniform float fadeDistance; uniform float saturation;
uniform vec2 mousePos; uniform float mouseInfluence; uniform float noiseAmount; uniform float distortion;
varying vec2 vUv;
float noise(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
float rayStrength(vec2 src, vec2 refDir, vec2 coord, float sA, float sB, float spd) {
  vec2 s2c = coord - src; vec2 dn = normalize(s2c);
  float ca = dot(dn, refDir);
  float da = ca + distortion * sin(iTime * 2.0 + length(s2c) * 0.01) * 0.2;
  float sf = pow(max(da, 0.0), 1.0 / max(lightSpread, 0.001));
  float dist = length(s2c); float mx = iResolution.x * rayLength;
  float lf = clamp((mx - dist) / mx, 0.0, 1.0);
  float ff = clamp((iResolution.x * fadeDistance - dist) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * spd * 3.0)) : 1.0;
  float base = clamp(
    (0.45 + 0.15 * sin(da * sA + iTime * spd)) +
    (0.3  + 0.2  * cos(-da * sB + iTime * spd)), 0.0, 1.0);
  return base * lf * ff * sf * pulse;
}
void main() {
  vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
  vec2 frd = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 ms = mousePos * iResolution.xy;
    frd = normalize(mix(rayDir, normalize(ms - rayPos), mouseInfluence));
  }
  vec4 r1 = vec4(1.0) * rayStrength(rayPos, frd, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  vec4 r2 = vec4(1.0) * rayStrength(rayPos, frd, coord, 22.3991, 18.0234, 1.1 * raysSpeed);
  vec4 fc = r1 * 0.5 + r2 * 0.4;
  if (noiseAmount > 0.0) { float n = noise(coord * 0.01 + iTime * 0.1); fc.rgb *= (1.0 - noiseAmount + noiseAmount * n); }
  float bright = 1.0 - (coord.y / iResolution.y);
  fc.x *= 0.1 + bright * 0.8; fc.y *= 0.3 + bright * 0.6; fc.z *= 0.5 + bright * 0.5;
  if (saturation != 1.0) { float g = dot(fc.rgb, vec3(0.299,0.587,0.114)); fc.rgb = mix(vec3(g), fc.rgb, saturation); }
  fc.rgb *= raysColor;
  gl_FragColor = fc;
}`;

      const uniforms = {
        iTime:          { value: 0 },
        iResolution:    { value: [1, 1] },
        rayPos:         { value: [0, 0] },
        rayDir:         { value: [0, 1] },
        raysColor:      { value: hexToRgb(raysColor) },
        raysSpeed:      { value: raysSpeed },
        lightSpread:    { value: lightSpread },
        rayLength:      { value: rayLength },
        pulsating:      { value: pulsating ? 1.0 : 0.0 },
        fadeDistance:   { value: fadeDistance },
        saturation:     { value: saturation },
        mousePos:       { value: [0.5, 0.5] },
        mouseInfluence: { value: mouseInfluence },
        noiseAmount:    { value: noiseAmount },
        distortion:     { value: distortion },
      };
      uniformsRef.current = uniforms;

      const geometry = new Triangle(gl);
      const program  = new Program(gl, { vertex: vert, fragment: frag, uniforms });
      meshRef.current = new Mesh(gl, { geometry, program });

      const place = () => {
        if (!containerRef.current || !renderer) return;
        renderer.dpr = Math.min(window.devicePixelRatio, 2);
        const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
        renderer.setSize(wCSS, hCSS);
        const dpr = renderer.dpr; const w = wCSS * dpr; const h = hCSS * dpr;
        uniforms.iResolution.value = [w, h];
        const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h);
        uniforms.rayPos.value = anchor; uniforms.rayDir.value = dir;
      };

      const loop = t => {
        if (!rendererRef.current || !uniformsRef.current || !meshRef.current) return;
        uniforms.iTime.value = t * 0.001;
        if (followMouse && mouseInfluence > 0.0) {
          const s = 0.92;
          smoothMouseRef.current.x = smoothMouseRef.current.x * s + mouseRef.current.x * (1 - s);
          smoothMouseRef.current.y = smoothMouseRef.current.y * s + mouseRef.current.y * (1 - s);
          uniforms.mousePos.value = [smoothMouseRef.current.x, smoothMouseRef.current.y];
        }
        try { renderer.render({ scene: meshRef.current }); animationIdRef.current = requestAnimationFrame(loop); }
        catch { /* WebGL context lost */ }
      };

      window.addEventListener('resize', place);
      place();
      animationIdRef.current = requestAnimationFrame(loop);

      cleanupRef.current = () => {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
        window.removeEventListener('resize', place);
        try {
          const canvas = renderer.gl.canvas;
          renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
          canvas?.parentNode?.removeChild(canvas);
        } catch { /* ignore */ }
        rendererRef.current = null; uniformsRef.current = null; meshRef.current = null;
      };
    };

    init();
    return () => { cleanupRef.current?.(); cleanupRef.current = null; };
  }, [isVisible, raysOrigin, raysColor, raysSpeed, lightSpread, rayLength, pulsating, fadeDistance, saturation, followMouse, mouseInfluence, noiseAmount, distortion]);

  // Hot-update uniforms without re-init
  useEffect(() => {
    const u = uniformsRef.current; const r = rendererRef.current;
    if (!u || !r || !containerRef.current) return;
    u.raysColor.value     = hexToRgb(raysColor);
    u.raysSpeed.value     = raysSpeed;
    u.lightSpread.value   = lightSpread;
    u.rayLength.value     = rayLength;
    u.pulsating.value     = pulsating ? 1.0 : 0.0;
    u.fadeDistance.value  = fadeDistance;
    u.saturation.value    = saturation;
    u.mouseInfluence.value = mouseInfluence;
    u.noiseAmount.value   = noiseAmount;
    u.distortion.value    = distortion;
    const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
    const dpr = r.dpr;
    const { anchor, dir } = getAnchorAndDir(raysOrigin, wCSS * dpr, hCSS * dpr);
    u.rayPos.value = anchor; u.rayDir.value = dir;
  }, [raysColor, raysSpeed, lightSpread, raysOrigin, rayLength, pulsating, fadeDistance, saturation, mouseInfluence, noiseAmount, distortion]);

  useEffect(() => {
    const onMove = e => {
      if (!containerRef.current || !rendererRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    };
    if (followMouse) { window.addEventListener('mousemove', onMove); return () => window.removeEventListener('mousemove', onMove); }
  }, [followMouse]);

  return <div ref={containerRef} className={`light-rays-container${className ? ` ${className}` : ''}`} />;
}
