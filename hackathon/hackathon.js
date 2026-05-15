// EIEC × SoPE Hackathon — Interactions
// Standalone. No dependencies.

// HERO BACKGROUND — DNA double helices
// One full-viewport canvas sits behind the hero. Two long helices are drawn
// on it: one anchored near the top-left, the other near the top-right. Both
// are tilted so they slant OUTWARD as they go down, with their bottoms
// extending past the viewport edges. The center of the viewport (where the
// hero text lives) stays clear because the helices have already exited the
// frame by the time they're near vertical center.
function initHeroParticles() {
  const canvas = document.querySelector('.hero-particles');
  if (!canvas) return;
  setupDualHelixCanvas(canvas);
}

function setupDualHelixCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Tuning knobs.
  const POINTS = 80;           // samples per strand (over the full helix length)
  const ROT_MS = 11000;        // ms for one full helix rotation
  const TURNS_PER_1000 = 4;    // visible helix turns per 1000 strand-units
  const TILT_DEG = 26;         // outward lean (left helix +, right helix −)
  const ORIGIN_FRAC = 0.20;    // helix top x-position as fraction of width
  const TEAL = '16, 186, 224';

  let w = 0, h = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  // Draw one helix anchored at (originX, 0) and tilted by tiltDeg degrees.
  // Positive tilt rotates clockwise in canvas coords (y-down), so a point
  // at local (0, +y) maps to world (originX − y·sin(tilt), y·cos(tilt)) —
  // i.e. positive tilt swings the bottom of the strand to the LEFT.
  function drawHelix(now, originX, tiltDeg) {
    const tiltRad = (tiltDeg * Math.PI) / 180;
    // Strand long enough to extend past the viewport bottom even after
    // tilting — scale with viewport diagonal.
    const length = Math.max(h * 1.7, Math.hypot(w, h) * 0.95);
    const amp = Math.min(w * 0.055, 60);
    const turns = (length / 1000) * TURNS_PER_1000;
    const phase = (now / ROT_MS) * Math.PI * 2;

    // Sample strand points in local (un-tilted) coords.
    const s1 = new Array(POINTS);
    const s2 = new Array(POINTS);
    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1);
      const y = t * length;
      const a = t * turns * Math.PI * 2 + phase;
      s1[i] = { x: amp * Math.cos(a),           y, depth: Math.sin(a) };
      s2[i] = { x: amp * Math.cos(a + Math.PI), y, depth: Math.sin(a + Math.PI) };
    }

    ctx.save();
    ctx.translate(originX, 0);
    ctx.rotate(tiltRad);

    // Rungs first (so dots paint over them at crossings).
    for (let i = 0; i < POINTS; i++) {
      const sep = Math.abs(s1[i].x - s2[i].x) / (amp * 2);
      const a = sep * 0.22;
      if (a < 0.01) continue;
      ctx.strokeStyle = `rgba(${TEAL}, ${a.toFixed(3)})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(s1[i].x, s1[i].y);
      ctx.lineTo(s2[i].x, s2[i].y);
      ctx.stroke();
    }

    // Particles z-sorted back-to-front.
    const all = s1.concat(s2);
    all.sort((p, q) => p.depth - q.depth);
    for (const p of all) {
      const front = (p.depth + 1) / 2;
      const a = 0.18 + 0.72 * front;
      const r = 2.0 + 2.6 * front;
      ctx.fillStyle = `rgba(${TEAL}, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw(now) {
    if (w === 0 || h === 0) {
      if (!resize()) {
        requestAnimationFrame(draw);
        return;
      }
    }

    ctx.clearRect(0, 0, w, h);
    // Left helix anchored at 20% of viewport width, tilts +26° → bottom
    // swings left, off-screen. Right is the mirror.
    drawHelix(now, w * ORIGIN_FRAC,         TILT_DEG);
    drawHelix(now, w * (1 - ORIGIN_FRAC),  -TILT_DEG);
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
}

// SCROLL REVEAL
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => observer.observe(el));
}

// TIMELINE DOT ILLUMINATION
// Adds .lit to .timeline-item when it crosses ~30% into the viewport,
// swapping the dot from muted grey to crimson. Lights don't turn off —
// once you've passed a point in the schedule, it stays lit.
function initTimelineDots() {
  const items = document.querySelectorAll('.timeline-item');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('lit');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -15% 0px' });

  items.forEach(el => observer.observe(el));
}

// SMOOTH ANCHOR SCROLL (offset for sticky nav)
function initSmoothAnchors() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href === '#' || href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();
    const navH = document.querySelector('nav')?.offsetHeight || 0;
    const top = target.getBoundingClientRect().top + window.scrollY - navH - 12;
    window.scrollTo({ top, behavior: 'smooth' });

    // close mobile nav if open
    document.querySelector('.nav-links')?.classList.remove('open');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initTimelineDots();
  initSmoothAnchors();
  initHeroParticles();
});
