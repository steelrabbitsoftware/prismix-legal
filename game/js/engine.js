// PRISMA × ABISMO — engine: loop, cenas, input, UI imediata
export const W = 960, H = 540;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.scenes = {};
    this.scene = null;
    this.sceneName = '';
    this.pointer = { x: W / 2, y: H / 2, down: false, justDown: false, justUp: false };
    this.keys = new Set();
    this.justKeys = new Set();
    this.time = 0;
    this._last = 0;
    this._hot = null;      // hovered ui id
    this._bindInput();
    requestAnimationFrame(t => this._frame(t));
  }

  add(name, scene) { this.scenes[name] = scene; scene.game = this; }

  switch(name, params) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.sceneName = name;
    this.scene = this.scenes[name];
    if (this.scene.enter) this.scene.enter(params || {});
  }

  _bindInput() {
    const c = this.canvas;
    this.touches = new Map();   // id → {x, y, dx, dy, startX, startY}
    const toXY = (clientX, clientY) => {
      const r = c.getBoundingClientRect();
      return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) };
    };
    // multitouch: cada dedo é rastreado separadamente (controles divididos)
    const tStart = (e) => {
      for (const t of e.changedTouches) {
        const p = toXY(t.clientX, t.clientY);
        this.touches.set(t.identifier, { x: p.x, y: p.y, dx: 0, dy: 0, startX: p.x, startY: p.y });
      }
      const f = e.touches[0];
      if (f) { const p = toXY(f.clientX, f.clientY); this.pointer.x = p.x; this.pointer.y = p.y; }
      this.pointer.down = true; this.pointer.justDown = true;
      e.preventDefault();
    };
    const tMove = (e) => {
      for (const t of e.changedTouches) {
        const p = toXY(t.clientX, t.clientY);
        const rec = this.touches.get(t.identifier);
        if (rec) { rec.dx += p.x - rec.x; rec.dy += p.y - rec.y; rec.x = p.x; rec.y = p.y; }
      }
      const f = e.touches[0];
      if (f) {
        const p = toXY(f.clientX, f.clientY);
        this.pointer.moveDX = (this.pointer.moveDX || 0) + (p.x - this.pointer.x);
        this.pointer.moveDY = (this.pointer.moveDY || 0) + (p.y - this.pointer.y);
        this.pointer.x = p.x; this.pointer.y = p.y;
      }
      e.preventDefault();
    };
    const tEnd = (e) => {
      for (const t of e.changedTouches) this.touches.delete(t.identifier);
      if (!e.touches.length) { this.pointer.down = false; this.pointer.justUp = true; }
    };
    c.addEventListener('touchstart', tStart, { passive: false });
    c.addEventListener('touchmove', tMove, { passive: false });
    window.addEventListener('touchend', tEnd);
    window.addEventListener('touchcancel', tEnd);

    const toLogical = (e) => {
      const r = c.getBoundingClientRect();
      const cx = e.clientX, cy = e.clientY;
      return { x: (cx - r.left) * (W / r.width), y: (cy - r.top) * (H / r.height) };
    };
    const down = (e) => { const p = toLogical(e); this.pointer.x = p.x; this.pointer.y = p.y; this.pointer.down = true; this.pointer.justDown = true; e.preventDefault(); };
    const move = (e) => {
      const p = toLogical(e);
      if (this.pointer.down) {           // arrasto relativo (controle mobile)
        this.pointer.moveDX = (this.pointer.moveDX || 0) + (p.x - this.pointer.x);
        this.pointer.moveDY = (this.pointer.moveDY || 0) + (p.y - this.pointer.y);
      }
      this.pointer.x = p.x; this.pointer.y = p.y;
    };
    const up = (e) => { this.pointer.down = false; this.pointer.justUp = true; };
    c.addEventListener('mousedown', down); c.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.justKeys.add(e.code);
      this.keys.add(e.code);
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    const fit = () => {
      const ww = window.innerWidth, wh = window.innerHeight;
      const s = Math.min(ww / W, wh / H);
      c.style.width = Math.floor(W * s) + 'px';
      c.style.height = Math.floor(H * s) + 'px';
    };
    window.addEventListener('resize', fit); fit();
  }

  key(code) { return this.keys.has(code); }
  justKey(code) { return this.justKeys.has(code); }

  _frame(t) {
    requestAnimationFrame(tt => this._frame(tt)); // agenda antes: erro numa cena não mata o loop
    const dt = Math.min(0.05, (t - this._last) / 1000 || 0.016);
    this._last = t; this.time += dt;
    if (this.scene) {
      this.scene.update(dt);
      this.scene.render(this.ctx);
    }
    this.pointer.justDown = false; this.pointer.justUp = false;
    this.pointer.moveDX = 0; this.pointer.moveDY = 0;
    for (const t of this.touches.values()) { t.dx = 0; t.dy = 0; }
    this.justKeys.clear();
  }
}

// ---------- paleta global (BALL x PIT vibe: roxo/rosa/dourado) ----------
export const PAL = {
  bg: '#1d1030', bg2: '#2a1a3e', panel: '#3b2456', panelDark: '#2c1a42',
  border: '#e8a0bf', borderDark: '#9c5f8a', gold: '#f5c56a', goldDark: '#b8863f',
  text: '#f3e6ff', textDim: '#b9a0d0', hp: '#e84a6f', xp: '#e042c8',
  good: '#7ce87c', bad: '#ff6a6a',
};

// ---------- UI imediata ----------
export function panel(ctx, x, y, w, h, opts = {}) {
  ctx.fillStyle = opts.fill || PAL.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = opts.border || PAL.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = opts.border2 || PAL.borderDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
  // cantos decorativos
  ctx.fillStyle = opts.border || PAL.border;
  for (const [cx, cy] of [[x, y], [x + w - 6, y], [x, y + h - 6], [x + w - 6, y + h - 6]])
    ctx.fillRect(cx + 2, cy + 2, 4, 4);
}

export function text(ctx, str, x, y, opts = {}) {
  ctx.font = `${opts.bold ? 'bold ' : ''}${opts.size || 14}px "Courier New", monospace`;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.baseline || 'top';
  if (opts.shadow !== false) {
    ctx.fillStyle = '#00000088';
    ctx.fillText(str, x + 1, y + 2);
  }
  ctx.fillStyle = opts.color || PAL.text;
  ctx.fillText(str, x, y);
}

export function button(game, ctx, id, label, x, y, w, h, opts = {}) {
  const p = game.pointer;
  const hover = p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  const active = hover && p.down;
  ctx.fillStyle = opts.disabled ? '#33224a' : active ? '#6b3f8f' : hover ? '#54307a' : (opts.fill || '#48286b');
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = opts.disabled ? PAL.borderDark : hover ? PAL.gold : PAL.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  text(ctx, label, x + w / 2, y + h / 2 - (opts.size || 14) / 2 + 1, {
    align: 'center', size: opts.size || 14, bold: true,
    color: opts.disabled ? PAL.textDim : (opts.color || PAL.text),
  });
  if (opts.sub) text(ctx, opts.sub, x + w / 2, y + h / 2 + 8, { align: 'center', size: 11, color: opts.subColor || PAL.gold });
  return hover && p.justDown && !opts.disabled;
}

export function bar(ctx, x, y, w, h, frac, color, back = '#00000066') {
  ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, Math.max(0, frac))), h - 2);
  ctx.strokeStyle = PAL.borderDark; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
export const irnd = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
export const fmt = (n) => n >= 10000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n).toLocaleString('pt-BR');
