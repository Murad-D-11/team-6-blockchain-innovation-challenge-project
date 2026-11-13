"use client";

import { useEffect, useRef } from "react";

/**
 * Interactive dust for the home page hero. A single canvas fills its parent (the hero), sits behind the content and
 * ignores pointer events itself; it listens on the parent instead so the pointer works anywhere in the hero, touch included.
 *
 * Each particle has a home position, drifts a few pixels around it, is pushed away from the pointer inside POINTER_RADIUS
 * and springs back when the pointer leaves. A pointerdown sends a short ripple outward.
 * Cost control: one particle per AREA_PER_PARTICLE px² (max MAX_PARTICLES), devicePixelRatio capped at 2, the loop pauses
 * while the hero is off screen or the tab is hidden, and with prefers-reduced-motion the dust is drawn once and never animated.
 * Dust directly behind elements marked data-dust-quiet (the headline and subtitle) is capped at QUIET_ALPHA so text stays readable.
 */

const COLORS = ["#FFD42A", "#FFFFFF", "#9DB7FF"] as const; // yellow, white, pale blue
const COLOR_SHARE = [0.7, 0.15, 0.15]; // fraction of particles per colour (the rest go to the last colour)
const AREA_PER_PARTICLE = 2500;
const MAX_PARTICLES = 900;
const POINTER_RADIUS = 120;
const QUIET_ALPHA = 0.35;
const QUIET_MARGIN = 16;
const RIPPLE_MS = 520;
const RIPPLE_SPEED = 0.45; // px per ms
const RIPPLE_BAND = 28;

type Ripple = { x: number; y: number; t0: number };

export function DustField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    // getContext can be missing or null (test environments, very old browsers): do nothing rather than throw.
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext("2d");
    } catch {
      context = null;
    }
    if (!context) return;
    const g: CanvasRenderingContext2D = context;

    let w = 0;
    let h = 0;
    let n = 0;
    let x = new Float32Array(0);
    let y = new Float32Array(0);
    let hx = new Float32Array(0);
    let hy = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let size = new Float32Array(0);
    let alpha = new Float32Array(0);
    let phase = new Float32Array(0);
    let speed = new Float32Array(0);
    let amp = new Float32Array(0);
    let colorEnd = [0, 0, 0]; // particles are grouped by colour: [0, colorEnd[0]) is colour 0, and so on
    let quiet: number[][] = [];

    let px = -1e4;
    let py = -1e4;
    const ripples: Ripple[] = [];

    let reduced = false;
    let visible = true;
    let running = false;
    let raf = 0;
    let last = 0;

    const mql = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    function init() {
      const rect = host!.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      quiet = Array.from(host!.querySelectorAll("[data-dust-quiet]")).map((el) => {
        const r = el.getBoundingClientRect();
        return [
          r.left - rect.left - QUIET_MARGIN,
          r.top - rect.top - QUIET_MARGIN,
          r.right - rect.left + QUIET_MARGIN,
          r.bottom - rect.top + QUIET_MARGIN,
        ];
      });

      n = Math.min(MAX_PARTICLES, Math.floor((w * h) / AREA_PER_PARTICLE));
      x = new Float32Array(n);
      y = new Float32Array(n);
      hx = new Float32Array(n);
      hy = new Float32Array(n);
      vx = new Float32Array(n);
      vy = new Float32Array(n);
      size = new Float32Array(n);
      alpha = new Float32Array(n);
      phase = new Float32Array(n);
      speed = new Float32Array(n);
      amp = new Float32Array(n);

      const first = Math.round(n * COLOR_SHARE[0]);
      const second = first + Math.round(n * COLOR_SHARE[1]);
      colorEnd = [first, second, n];
      for (let i = 0; i < n; i++) {
        hx[i] = x[i] = Math.random() * w;
        hy[i] = y[i] = Math.random() * h;
        size[i] = 0.6 + Math.random() * 1.4;
        alpha[i] = 0.3 + Math.random() * 0.6;
        phase[i] = Math.random() * Math.PI * 2;
        speed[i] = 0.25 + Math.random() * 0.5;
        amp[i] = 3 + Math.random() * 9;
      }
    }

    function inQuiet(qx: number, qy: number) {
      for (let i = 0; i < quiet.length; i++) {
        const q = quiet[i];
        if (qx > q[0] && qx < q[2] && qy > q[1] && qy < q[3]) return true;
      }
      return false;
    }

    function step(now: number) {
      const k = Math.min(now - last, 32) / 16.667;
      last = now;
      const t = now / 1000;
      const damp = Math.pow(0.88, k);
      const radius2 = POINTER_RADIUS * POINTER_RADIUS;

      for (let i = ripples.length - 1; i >= 0; i--) {
        if (now - ripples[i].t0 > RIPPLE_MS) ripples.splice(i, 1);
      }

      for (let i = 0; i < n; i++) {
        const tx = hx[i] + Math.sin(t * speed[i] + phase[i]) * amp[i];
        const ty = hy[i] + Math.cos(t * speed[i] * 0.83 + phase[i] * 1.7) * amp[i];
        let ax = (tx - x[i]) * 0.04;
        let ay = (ty - y[i]) * 0.04;

        if (px > -1e3) {
          const dx = x[i] - px;
          const dy = y[i] - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < radius2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / POINTER_RADIUS) ** 2 * 1.1;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }

        for (let r = 0; r < ripples.length; r++) {
          const rp = ripples[r];
          const age = now - rp.t0;
          const dx = x[i] - rp.x;
          const dy = y[i] - rp.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const off = Math.abs(d - age * RIPPLE_SPEED);
          if (off < RIPPLE_BAND) {
            const f = (1 - off / RIPPLE_BAND) * (1 - age / RIPPLE_MS) * 1.6;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }

        vx[i] = (vx[i] + ax * k) * damp;
        vy[i] = (vy[i] + ay * k) * damp;
        x[i] += vx[i] * k;
        y[i] += vy[i] * k;
      }
    }

    function draw() {
      g.clearRect(0, 0, w, h);
      let group = 0;
      g.fillStyle = COLORS[0];
      for (let i = 0; i < n; i++) {
        while (i >= colorEnd[group]) {
          group++;
          g.fillStyle = COLORS[Math.min(group, COLORS.length - 1)];
        }
        let a = alpha[i];
        if (a > QUIET_ALPHA && inQuiet(x[i], y[i])) a = QUIET_ALPHA;
        g.globalAlpha = a;
        const s = size[i];
        g.fillRect(x[i] - s / 2, y[i] - s / 2, s, s);
      }
      g.globalAlpha = 1;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      step(now);
      draw();
    }

    function start() {
      if (running || !visible || reduced || document.visibilityState === "hidden") return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function toCanvas(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
    }

    function onMove(e: PointerEvent) {
      toCanvas(e);
    }

    function onDown(e: PointerEvent) {
      toCanvas(e);
      ripples.push({ x: px, y: py, t0: performance.now() });
      if (ripples.length > 4) ripples.shift();
    }

    function onRelease(e: PointerEvent) {
      // A mouse stays "over" the hero after a click; a finger does not.
      if (e.pointerType !== "mouse") px = py = -1e4;
    }

    function onLeave() {
      px = py = -1e4;
    }

    function addPointerListeners() {
      host!.addEventListener("pointermove", onMove);
      host!.addEventListener("pointerdown", onDown);
      host!.addEventListener("pointerup", onRelease);
      host!.addEventListener("pointercancel", onLeave);
      host!.addEventListener("pointerleave", onLeave);
    }

    function removePointerListeners() {
      host!.removeEventListener("pointermove", onMove);
      host!.removeEventListener("pointerdown", onDown);
      host!.removeEventListener("pointerup", onRelease);
      host!.removeEventListener("pointercancel", onLeave);
      host!.removeEventListener("pointerleave", onLeave);
    }

    function setReduced(flag: boolean) {
      reduced = flag;
      stop();
      removePointerListeners();
      px = py = -1e4;
      ripples.length = 0;
      init();
      draw();
      if (!reduced) {
        addPointerListeners();
        start();
      }
    }

    const onMotionChange = () => setReduced(!!mql?.matches);
    mql?.addEventListener?.("change", onMotionChange);

    const onVisibility = () => (document.visibilityState === "hidden" ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) start();
        else stop();
      });
      io.observe(host);
    }

    const onResize = () => {
      init();
      if (!running) draw();
    };
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(host);
    } else {
      window.addEventListener("resize", onResize);
    }

    setReduced(!!mql?.matches);

    return () => {
      stop();
      removePointerListeners();
      mql?.removeEventListener?.("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" tabIndex={-1} className={`pointer-events-none absolute inset-0 z-0 h-full w-full ${className}`} />;
}
