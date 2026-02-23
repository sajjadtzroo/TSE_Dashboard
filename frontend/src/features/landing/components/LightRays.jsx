import { useEffect, useRef, useState } from 'react';

/**
 * WebGL light-rays background effect.
 * Ported from reactbits.dev/backgrounds/light-rays (MIT licence, DavidHDev/react-bits).
 * Rewritten to use raw WebGL so no extra dependency is needed.
 */

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [1, 1, 1];
};

const getAnchorAndDir = (origin, w, h) => {
  const o = 0.2;
  switch (origin) {
    case 'top-left':      return { anchor: [0,          -o * h],     dir: [0,  1] };
    case 'top-right':     return { anchor: [w,          -o * h],     dir: [0,  1] };
    case 'left':          return { anchor: [-o * w,      0.5 * h],   dir: [1,  0] };
    case 'right':         return { anchor: [(1+o)*w,     0.5 * h],   dir: [-1, 0] };
    case 'bottom-left':   return { anchor: [0,           (1+o)*h],   dir: [0, -1] };
    case 'bottom-center': return { anchor: [0.5*w,       (1+o)*h],   dir: [0, -1] };
    case 'bottom-right':  return { anchor: [w,           (1+o)*h],   dir: [0, -1] };
    default:              return { anchor: [0.5*w,       -o * h],    dir: [0,  1] }; // top-center
  }
};

const VERT = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;
uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDir, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2  d           = coord - raySource;
  float cosAngle    = dot(normalize(d), rayRefDir);
  float da          = cosAngle + distortion * sin(iTime * 2.0 + length(d) * 0.01) * 0.2;
  float spread      = pow(max(da, 0.0), 1.0 / max(lightSpread, 0.001));
  float dist        = length(d);
  float maxDist     = iResolution.x * rayLength;
  float lenFalloff  = clamp((maxDist - dist) / maxDist, 0.0, 1.0);
  float fadeFalloff = clamp((iResolution.x * fadeDistance - dist) /
                            (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse       = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;
  float base        = clamp(
    (0.45 + 0.15 * sin(da * seedA + iTime * speed)) +
    (0.30 + 0.20 * cos(-da * seedB + iTime * speed)),
    0.0, 1.0);
  return base * lenFalloff * fadeFalloff * spread * pulse;
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);

  vec2 finalDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mScreen = mousePos * iResolution.xy;
    finalDir = normalize(mix(rayDir, normalize(mScreen - rayPos), mouseInfluence));
  }

  float r1 = rayStrength(rayPos, finalDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  float r2 = rayStrength(rayPos, finalDir, coord, 22.3991, 18.0234,  1.1 * raysSpeed);
  vec4  col = vec4(1.0) * (r1 * 0.5 + r2 * 0.4);

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    col.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float bri = 1.0 - (coord.y / iResolution.y);
  col.x *= 0.1 + bri * 0.8;
  col.y *= 0.3 + bri * 0.6;
  col.z *= 0.5 + bri * 0.5;

  if (saturation != 1.0) {
    float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    col.rgb = mix(vec3(gray), col.rgb, saturation);
  }

  col.rgb *= raysColor;
  gl_FragColor = col;
}`;

export default function LightRays({
  raysOrigin      = 'top-center',
  raysColor       = '#ffffff',
  raysSpeed       = 1,
  lightSpread     = 1,
  rayLength       = 2,
  pulsating       = false,
  fadeDistance    = 1.0,
  saturation      = 1.0,
  followMouse     = true,
  mouseInfluence  = 0.1,
  noiseAmount     = 0.0,
  distortion      = 0.0,
}) {
  const containerRef   = useRef(null);
  const rafRef         = useRef(null);
  const mouseRef       = useRef({ x: 0.5, y: 0.5 });
  const smoothRef      = useRef({ x: 0.5, y: 0.5 });
  const [isVisible, setIsVisible] = useState(false);

  /* ── Intersection observer — pause when off-screen ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setIsVisible(e.isIntersecting),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ── WebGL init / teardown ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!isVisible || !container) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) { canvas.remove(); return; }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const makeShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, makeShader(gl.VERTEX_SHADER,   VERT));
    gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    /* Full-screen triangle */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    /* Cache uniform locations */
    const UNIFORMS = [
      'iTime','iResolution','rayPos','rayDir',
      'raysColor','raysSpeed','lightSpread','rayLength',
      'pulsating','fadeDistance','saturation',
      'mousePos','mouseInfluence','noiseAmount','distortion',
    ];
    const u = Object.fromEntries(UNIFORMS.map(n => [n, gl.getUniformLocation(prog, n)]));

    const dpr     = () => Math.min(window.devicePixelRatio, 2);
    const resize  = () => {
      const d = dpr();
      canvas.width  = container.clientWidth  * d;
      canvas.height = container.clientHeight * d;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    const [cr, cg, cb] = hexToRgb(raysColor);

    const loop = (t) => {
      const d  = dpr();
      const w  = container.clientWidth  * d;
      const h  = container.clientHeight * d;
      const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(u.iTime,          t * 0.001);
      gl.uniform2f(u.iResolution,    w, h);
      gl.uniform2f(u.rayPos,         anchor[0], anchor[1]);
      gl.uniform2f(u.rayDir,         dir[0],    dir[1]);
      gl.uniform3f(u.raysColor,      cr, cg, cb);
      gl.uniform1f(u.raysSpeed,      raysSpeed);
      gl.uniform1f(u.lightSpread,    lightSpread);
      gl.uniform1f(u.rayLength,      rayLength);
      gl.uniform1f(u.pulsating,      pulsating    ? 1.0 : 0.0);
      gl.uniform1f(u.fadeDistance,   fadeDistance);
      gl.uniform1f(u.saturation,     saturation);
      gl.uniform1f(u.mouseInfluence, followMouse ? mouseInfluence : 0.0);
      gl.uniform1f(u.noiseAmount,    noiseAmount);
      gl.uniform1f(u.distortion,     distortion);

      if (followMouse) {
        const s = 0.92;
        smoothRef.current.x = smoothRef.current.x * s + mouseRef.current.x * (1 - s);
        smoothRef.current.y = smoothRef.current.y * s + mouseRef.current.y * (1 - s);
        gl.uniform2f(u.mousePos, smoothRef.current.x, smoothRef.current.y);
      } else {
        gl.uniform2f(u.mousePos, 0.5, 0.5);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.parentNode?.removeChild(canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, raysOrigin, raysColor, raysSpeed, lightSpread, rayLength,
      pulsating, fadeDistance, saturation, followMouse, mouseInfluence,
      noiseAmount, distortion]);

  /* ── Mouse tracking ── */
  useEffect(() => {
    if (!followMouse) return;
    const onMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top)  / rect.height,
      };
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [followMouse]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    />
  );
}
