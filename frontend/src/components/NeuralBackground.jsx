import { useEffect, useRef } from 'react';

export default function NeuralBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: -1000, y: -1000, active: false };
    let nodes = [];
    let width = 0;
    let height = 0;
    let ratio = 1;
    let frame = 0;
    let start = performance.now();

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.max(100, Math.min(260, Math.round(width * height / 5000)));
      const bandCenter = height * 0.53;
      const bandHeight = Math.min(height * 0.56, 390);
      nodes = Array.from({ length: count }, (_, index) => {
        const x = (index / (count - 1)) * width + (Math.random() - 0.5) * 34;
        const y = bandCenter + (Math.random() - 0.5) * bandHeight;
        return {
          x,
          baseX: x,
          baseY: y,
          phase: Math.random() * Math.PI * 2,
          speed: 0.45 + Math.random() * 1.15,
          drift: 3 + Math.random() * 12,
          radius: 1.2 + Math.random() * 1.5,
          vx: 0,
          vy: 0,
          energy: Math.random(),
        };
      });
    }

    function render(now) {
      const elapsed = reducedMotion.matches ? 0 : (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);

      for (const node of nodes) {
        const wave = Math.sin(elapsed * node.speed + node.phase);
        const targetY = node.baseY + wave * node.drift;
        const dx = node.x - pointer.x;
        const dy = node.y - pointer.y;
        const distance = Math.hypot(dx, dy);

        if (!reducedMotion.matches && pointer.active && distance < 190 && distance > 0) {
          const push = ((190 - distance) / 190) * 5.5;
          node.vx += (dx / distance) * push;
          node.vy += (dy / distance) * push;
        }
        node.vx += (node.baseX - node.x) * 0.002;
        node.vy += (targetY - node.y) * 0.018;
        node.vx *= 0.91;
        node.vy *= 0.86;
        node.x += node.vx;
        node.y += node.vy;
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > 105) continue;
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const cursorBoost = pointer.active
            ? Math.max(0, 1 - Math.hypot(midX - pointer.x, midY - pointer.y) / 250)
            : 0;
          const opacity = (1 - distance / 105) * (0.2 + cursorBoost * 0.48);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(13, 190, 224, ${opacity})`;
          ctx.lineWidth = 0.7 + cursorBoost * 0.75;
          ctx.stroke();
        }
      }

      for (const node of nodes) {
        const cursorBoost = pointer.active
          ? Math.max(0, 1 - Math.hypot(node.x - pointer.x, node.y - pointer.y) / 210)
          : 0;
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2 + node.phase);
        const radius = node.radius + cursorBoost * 1.8 + (node.energy > 0.88 ? pulse * 2 : 0);
        if (node.energy > 0.88 || cursorBoost > 0.65) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 203, 239, ${0.045 + cursorBoost * 0.1})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(15, 177, 208, ${0.48 + cursorBoost * 0.42})`;
        ctx.fill();
      }

      if (!reducedMotion.matches) frame = window.requestAnimationFrame(render);
    }

    function move(event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    }

    function leave() {
      pointer.active = false;
      pointer.x = -1000;
      pointer.y = -1000;
    }

    function restart() {
      window.cancelAnimationFrame(frame);
      start = performance.now();
      render(start);
    }

    resize();
    render(start);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', leave);
    document.addEventListener('pointerleave', leave);
    reducedMotion.addEventListener?.('change', restart);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', leave);
      document.removeEventListener('pointerleave', leave);
      reducedMotion.removeEventListener?.('change', restart);
    };
  }, []);

  return <canvas ref={canvasRef} className="neural-background" aria-hidden="true" />;
}
