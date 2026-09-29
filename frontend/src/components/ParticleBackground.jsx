import { useEffect, useRef } from 'react';

// Palette pulled from index.css custom properties, with graceful fallbacks
// in case this component ever renders before the CSS variables are available.
const PARTICLE_COLORS = [
  { rgb: '71, 106, 80', weight: 3 },   // --sage-deep
  { rgb: '102, 138, 107', weight: 2 }, // --sage-dark
  { rgb: '159, 190, 160', weight: 2 }, // --sage
  { rgb: '128, 108, 168', weight: 2 }, // --lavender-dark
  { rgb: '169, 154, 203', weight: 1 }, // --lavender
];

const LINE_RGB = '113, 128, 116'; // --muted, kept neutral so the web doesn't fight the dots

function pickColor() {
  const total = PARTICLE_COLORS.reduce((sum, c) => sum + c.weight, 0);
  let r = Math.random() * total;
  for (const c of PARTICLE_COLORS) {
    if (r < c.weight) return c.rgb;
    r -= c.weight;
  }
  return PARTICLE_COLORS[0].rgb;
}

export default function ParticleBackground({
  className = 'neural-background',
  density = 9500, // px^2 per particle — lower is denser
  maxParticles = 170,
  linkDistance = 150,
  cursorRadius = 170,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    let animationId = null;
    let running = true;

    const pointer = { x: -9999, y: -9999, active: false };

    function makeParticles() {
      const area = width * height;
      const count = Math.min(maxParticles, Math.max(24, Math.round(area / density)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 1,
        color: pickColor(),
      }));
    }

    function resize() {
      // The canvas is fixed and covers the viewport (see .neural-background in
      // index.css), so size it against the canvas's own box rather than a
      // scrolling parent, which could be much taller than the screen.
      const rect = canvas.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeParticles();
    }

    function step() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        // gentle drift
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.x = Math.min(Math.max(p.x, 0), width);
        p.y = Math.min(Math.max(p.y, 0), height);

        // cursor influence: gentle repel so the web parts around the pointer
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < cursorRadius && dist > 0.01) {
            const force = (1 - dist / cursorRadius) * 0.6;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }
      }

      // links between nearby particles
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDistance) {
            const alpha = (1 - dist / linkDistance) * 0.42;
            ctx.strokeStyle = `rgba(${LINE_RGB}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // link to cursor for particles close to it
        if (pointer.active) {
          const dx = a.x - pointer.x;
          const dy = a.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < cursorRadius) {
            const alpha = (1 - dist / cursorRadius) * 0.55;
            ctx.strokeStyle = `rgba(128, 108, 168, ${alpha})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      // draw particles on top of links, with a soft glow so they read
      // clearly against the light background
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, 0.9)`;
        ctx.shadowColor = `rgba(${p.color}, 0.55)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationId = requestAnimationFrame(step);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, 0.8)`;
        ctx.fill();
      }
    }

    function handlePointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }

    function handlePointerLeave() {
      pointer.active = false;
    }

    function handleTouchMove(e) {
      if (!e.touches || !e.touches.length) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.touches[0].clientX - rect.left;
      pointer.y = e.touches[0].clientY - rect.top;
      pointer.active = true;
    }

    function handleTouchEnd() {
      pointer.active = false;
    }

    resize();

    if (prefersReducedMotion) {
      drawStatic();
    } else {
      animationId = requestAnimationFrame(step);
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    return () => {
      running = false;
      if (animationId) cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [density, maxParticles, linkDistance, cursorRadius]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}