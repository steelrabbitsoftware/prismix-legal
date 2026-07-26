// Cena de combate: a Run no Abismo
import { W, H, PAL, panel, text, button, bar, rnd, irnd, pick, clamp, dist2, fmt } from './engine.js';
import { drawSprite, ballSprite, shade } from './sprites.js';
import { BALLS, FUSIONS, ENEMIES, BIOMES, waveSpec, derive } from './data.js';
import { sfx, buzz } from './audio.js';
import { drawControlOptions } from './options.js';
import * as SAVE from './save.js';

const AR = { x: 252, y: 6, w: 456, h: 528 };       // arena
const STRIP = 34;                                   // faixas laterais temáticas (biomas)
const PB = { x: AR.x + STRIP, w: AR.w - STRIP * 2 };// área jogável entre as faixas
const FLOOR = AR.y + AR.h - 30;                     // linha de defesa (borda inferior)
const COLS = 6;                                     // colunas da grade de inimigos
const DANGER_Y = AR.y + AR.h - 96;                  // linha vermelha: início da zona de perigo
const TELEGRAPH = 1.5;                              // segundos de aviso antes do golpe pesado
const MAX_SLOTS = 4;
const FINAL_WAVE = 15;
const colX = (c) => PB.x + (PB.w / COLS) * (c + 0.5);

export class Combat {
  enter({ char }) {
    this.char = char;
    const meta = SAVE.metaBonus();
    this.d = derive(char, meta);
    // bônus do nível persistente do herói (+2% dano e +2 PV por nível)
    const hl = SAVE.heroLevel(char.id);
    this.d.dmgMul *= 1 + 0.02 * (hl.nivel - 1);
    this.d.hp += 2 * (hl.nivel - 1);
    this.hp = this.d.hp; this.maxHp = this.d.hp;
    this.x = AR.x + AR.w / 2;
    this.y = FLOOR - 20;                            // movimento livre pela arena
    this.fase = -1;
    this.level = 1; this.xp = 0; this.xpNext = 6;
    this.gold = 0; this.kills = 0; this.timeAlive = 0;
    this.magnet = 95;
    this.bonus = { fire: 1, move: 1, crit: 0, vel: 1, dmg: 1 };
    this.slots = [{ type: char.ball, level: 1, count: this.d.babyCount, inFlight: 0 }];
    if (char.extraBall) {
      const t = pick(['fogo', 'gelo', 'sangue', 'veneno', 'raio', 'ferro', 'vento']);
      this.slots.push({ type: t, level: 1, count: this.d.babyCount, inFlight: 0 });
    }
    this.cfg = SAVE.config();
    this.aimTouch = null;
    this.foeShots = [];      // flechas e magias dos inimigos
    this.roadY = 0;          // deslocamento da estrada (sensação de avanço)
    this.balls = []; this.enemies = []; this.drops = []; this.pools = [];
    this.parts = []; this.nums = [];
    this.wave = 0; this.spawnQueue = []; this.spawnT = 0;
    this.fireT = 0; this.slotIdx = 0;
    this.state = 'play';
    this.banner = null; this.bannerT = 0;
    this.stats = {};       // por tipo: {lanc, dano}
    this.cards = []; this.rerolls = 1;
    this.shake = 0;
    this.nextWave();
  }

  // ---------------- ondas (formação em grade) ----------------
  biome() { return BIOMES[Math.floor((this.wave - 1) / 5) % BIOMES.length]; }

  nextWave() {
    this.wave++;
    const spec = waveSpec(this.wave);
    this.hpMul = spec.hpMul;
    // velocidade da formação: todos descem juntos, alinhados
    this.rowSpeed = 15 + this.wave * 1.1;
    this.spawnQueue = [];   // fila de FILEIRAS (linhas da grade)
    if (spec.boss) {
      this.spawnQueue.push(['boss']);
      let left = Math.floor(spec.count / 2);
      while (left > 0) { const r = this.makeRow(spec, left); left -= r.filter(Boolean).length; this.spawnQueue.push(r); }
      sfx.boss();
      this.setBanner(this.wave % 15 === 0 ? 'O OLHO FINAL DO ABISMO' : 'CHEFE: OLHO DO ABISMO');
    } else {
      let left = spec.count;
      while (left > 0) { const r = this.makeRow(spec, left); left -= r.filter(Boolean).length; this.spawnQueue.push(r); }
      const fase = Math.floor((this.wave - 1) / 5);
      if (fase !== this.fase) {
        this.fase = fase;
        this.setBanner(`Fase ${fase + 1} — ${this.biome().nome}`);
      } else this.setBanner(`Onda ${this.wave}`);
    }
    this.spawnT = 0.5;
  }

  // fileira: slots lado a lado, preenchidos de forma organizada e aleatória
  makeRow(spec, maxCount) {
    const row = new Array(COLS).fill(null);
    const fill = Math.min(maxCount, irnd(2, Math.min(COLS, 3 + Math.floor(this.wave / 3))));
    const cols = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, fill);
    for (const c of cols) row[c] = this.pickType(spec);
    return row;
  }

  pickType(spec) {
    const tot = spec.pool.reduce((a, p) => a + p[1], 0);
    let r = rnd(tot);
    for (const [t, w] of spec.pool) { r -= w; if (r <= 0) return t; }
    return 'slime';
  }

  setBanner(msg) { this.banner = msg; this.bannerT = 2.2; }

  spawnRow(row) {
    if (row[0] === 'boss' && row.length === 1) { this.spawnEnemy('boss', -1); return; }
    row.forEach((type, c) => { if (type) this.spawnEnemy(type, c); });
  }

  spawnEnemy(type, col) {
    const E = ENEMIES[type];
    const boss = !!E.boss;
    const hp = E.hp * this.hpMul * (boss ? 1 + this.wave / 10 : 1);
    this.enemies.push({
      type, ...E, hp, maxHp: hp,
      x: boss ? AR.x + AR.w / 2 : colX(col),
      y: -30, phase0: rnd(Math.PI * 2),
      conds: {}, hitT: 0, spawnT: 1.6,
    });
  }

  // ---------------- update ----------------
  update(dt) {
    const g = this.game;
    if (g.justKey('Escape')) {
      if (this.state === 'play') this.state = 'pause';
      else if (this.state === 'pause') this.state = 'play';
    }
    if (this.state === 'levelup' || this.state === 'pause') return;
    if (this.state === 'over') { this.overT -= dt; if (this.overT <= 0) this.finish(false); return; }
    if (this.state === 'won') { this.overT -= dt; if (this.overT <= 0) this.finish(true); return; }

    this.timeAlive += dt;
    this.invulnT = Math.max(0, (this.invulnT || 0) - dt);
    this.shake = Math.max(0, this.shake - dt * 30);
    if (this.bannerT > 0) this.bannerT -= dt;

    // ---- controles ----
    let mx = 0, my = 0;
    if (g.key('ArrowLeft') || g.key('KeyA')) mx -= 1;
    if (g.key('ArrowRight') || g.key('KeyD')) mx += 1;
    if (g.key('ArrowUp') || g.key('KeyW')) my -= 1;
    if (g.key('ArrowDown') || g.key('KeyS')) my += 1;
    const spd = this.d.moveSpd * this.bonus.move * dt;
    if (mx || my) {
      const ml = Math.hypot(mx, my);
      this.x += (mx / ml) * spd; this.y += (my / ml) * spd;
    } else if (this.cfg.modo === 'split' && g.touches && g.touches.size) {
      // tela dividida: um lado move, o outro posiciona a mira
      const moveEsq = !this.cfg.canhoto;
      this.aimTouch = null;
      for (const t of g.touches.values()) {
        const naEsquerda = t.startX < W / 2;
        if (naEsquerda === moveEsq) {          // lado de movimento: arrasto relativo
          this.x += t.dx * 1.6; this.y += t.dy * 1.6;
        } else {                               // lado da mira: posição absoluta
          this.aimTouch = { x: t.x, y: t.y };
        }
      }
    } else if (g.pointer.down) {
      this.x += (g.pointer.moveDX || 0) * 1.6;
      this.y += (g.pointer.moveDY || 0) * 1.6;
    }
    if (this.cfg.modo === 'split' && (!g.touches || !g.touches.size)) this.aimTouch = null;
    this.x = clamp(this.x, PB.x + 14, PB.x + PB.w - 14);
    this.y = clamp(this.y, AR.y + 50, AR.y + AR.h - 18);

    // disparo
    this.fireT += dt;
    const interval = 1 / (this.d.fireRate * this.bonus.fire);
    while (this.fireT >= interval) {
      this.fireT -= interval;
      this.fireBall();
    }

    // spawn de fileiras: espaçadas para manter a grade organizada
    if (this.spawnQueue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnRow(this.spawnQueue.shift());
        this.spawnT = 68 / this.rowSpeed; // espaçamento vertical constante entre fileiras
      }
    } else if (!this.enemies.length) {
      if (this.wave >= FINAL_WAVE) { this.state = 'won'; this.overT = 1.6; sfx.win(); return; }
      this.heal(8); // respiro entre ondas
      this.nextWave();
    }

    this.roadY = (this.roadY + 34 * dt) % 48;   // estrada avançando
    this.updateBalls(dt);
    this.updateEnemies(dt);
    this.updateFoeShots(dt);
    this.updateDrops(dt);
    this.updatePools(dt);

    // partículas / números
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
    this.parts = this.parts.filter(p => p.t > 0);
    for (const n of this.nums) { n.y -= 26 * dt; n.t -= dt; }
    this.nums = this.nums.filter(n => n.t > 0);
  }

  // alvo automático: inimigo mais próximo (a retícula mostra quem está na mira)
  target() {
    let best = null, bd = Infinity;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.y < AR.y) continue;
      const d = dist2(e.x, e.y, this.x, this.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ponto de mira: manual (dedo da direita / mouse) ou automático no mais próximo
  aimPoint() {
    if (this.cfg.modo === 'split') {
      if (this.aimTouch) return this.aimTouch;
      const g = this.game;
      if (!g.touches.size && g.pointer.x > AR.x) return { x: g.pointer.x, y: g.pointer.y, manual: true };
    }
    const t = this.target();
    if (t) return { x: t.x, y: t.y, auto: true };
    return { x: this.x, y: this.y - 100, auto: true };
  }

  aimDir() {
    const p = this.aimPoint();
    let dx = p.x - this.x, dy = p.y - this.y;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) { dx = 0; dy = -1; }
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }

  fireBall() {
    // procura próximo slot com bola disponível
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[(this.slotIdx + i) % this.slots.length];
      if (s.inFlight < s.count) {
        this.slotIdx = (this.slotIdx + i + 1) % this.slots.length;
        const B = BALLS[s.type];
        const dir = this.aimDir();
        let ang = Math.atan2(dir.y, dir.x);
        ang += rnd(-0.10, 0.10); // dispersão natural: evita coluna única
        if (this.char.spread) ang += rnd(-this.char.spread, this.char.spread);
        const v = B.vel * this.d.ballVel * this.bonus.vel;
        this.balls.push({
          slot: s, type: s.type, x: this.x, y: this.y - 8,
          vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
          r: B.fusion ? 8 : 6.5, pierce: this.char.pierce || 0, bounces: 0,
          trail: [],
        });
        s.inFlight++;
        const st = this.stats[s.type] || (this.stats[s.type] = { lanc: 0, dano: 0 });
        st.lanc++;
        sfx.shoot();
        return;
      }
    }
  }

  updateBalls(dt) {
    const rm = [];
    for (const b of this.balls) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.trail) {                       // rastro pontilhado
        b.trail.push(b.x, b.y);
        if (b.trail.length > 16) b.trail.splice(0, 2);
      }
      if (b.x < PB.x + b.r) { b.x = PB.x + b.r; b.vx = Math.abs(b.vx); b.bounces++; }
      if (b.x > PB.x + PB.w - b.r) { b.x = PB.x + PB.w - b.r; b.vx = -Math.abs(b.vx); b.bounces++; }
      if (b.y < AR.y + b.r) { b.y = AR.y + b.r; b.vy = Math.abs(b.vy); b.bounces++; }
      if (b.y > AR.y + AR.h + 20) { rm.push(b); continue; }
      if (b.frag && b.bounces > 2) { rm.push(b); continue; }
      if (b.bounces > 8) { rm.push(b); continue; } // recicla esferas presas
      // colisão com inimigos
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const er = e.boss ? 34 : 15;
        if (dist2(b.x, b.y, e.x, e.y) < (er + b.r) ** 2) {
          this.hitEnemy(b, e);
          if (b.pierceUsed === undefined) b.pierceUsed = 0;
          if (b.pierceUsed < b.pierce) { b.pierceUsed++; }
          else {
            // reflete pela normal
            const nx = (b.x - e.x), ny = (b.y - e.y);
            const nl = Math.hypot(nx, ny) || 1;
            const dot = (b.vx * nx + b.vy * ny) / nl;
            if (dot < 0) { b.vx -= 2 * dot * nx / nl; b.vy -= 2 * dot * ny / nl; }
            b.x = e.x + (nx / nl) * (er + b.r + 1);
            b.y = e.y + (ny / nl) * (er + b.r + 1);
            b.bounces++;
          }
          break;
        }
      }
    }
    for (const b of rm) {
      if (b.slot) b.slot.inFlight = Math.max(0, b.slot.inFlight - 1);
      this.balls.splice(this.balls.indexOf(b), 1);
    }
  }

  hitEnemy(b, e, mul = 1) {
    const B = BALLS[b.type];
    const s = b.slot || { level: 1 };
    const isCrit = Math.random() < this.d.crit + this.bonus.crit + (B.crit || 0);
    let dmg = B.dmg * (1 + 0.25 * (s.level - 1)) * this.d.dmgMul * this.bonus.dmg * mul * (isCrit ? 2 : 1);
    dmg *= rnd(0.9, 1.1);
    this.dealDamage(e, dmg, b.type, isCrit);
    if (isCrit) sfx.crit(); else sfx.hit();

    // condições e efeitos
    const cm = this.d.condMul;
    if (B.cond) this.applyCond(e, B.cond, s.level, cm);
    if (B.cond2) this.applyCond(e, B.cond2, s.level, cm);
    if (B.knock) e.y -= B.knock;
    if (B.aoe === 'slow') for (const o of this.enemies) if (dist2(o.x, o.y, e.x, e.y) < 90 ** 2) this.applyCond(o, 'slow', s.level, cm);
    if (B.chain) this.chain(e, b, B.chain, dmg * 0.5);
    if (B.pool) this.pools.push({ x: e.x, y: e.y, r: 42, t: 3, dps: dmg * 0.4 });
    if (B.lifesteal) this.heal(1);
    if (B.shatter && !b.frag) {
      for (let i = 0; i < B.shatter; i++) {
        const a = rnd(Math.PI * 2);
        this.balls.push({ slot: null, type: b.type, frag: true, x: e.x, y: e.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 3.5, pierce: 0, bounces: 0 });
      }
    }
    this.burst(e.x, e.y, B.cor, isCrit ? 10 : 5);
  }

  applyCond(e, cond, level, cm) {
    const c = e.conds;
    if (cond === 'burn') c.burn = { t: 3 * cm, dps: 3 * level * cm };
    if (cond === 'slow') c.slow = { t: 2.2 * cm, f: 0.5 };
    if (cond === 'poison') c.poison = { t: 4 * cm, pct: 0.02 * level * cm };
    if (cond === 'bleed') {
      const st = (c.bleed?.stacks || 0) + 1;
      c.bleed = { t: 4 * cm, stacks: Math.min(8, st), dps: 1.5 * level * cm };
    }
  }

  chain(from, b, count, dmg) {
    let src = from;
    for (let i = 0; i < count; i++) {
      let best = null, bd = 150 ** 2;
      for (const o of this.enemies) {
        if (o === src || o.hp <= 0) continue;
        const d = dist2(o.x, o.y, src.x, src.y);
        if (d < bd) { bd = d; best = o; }
      }
      if (!best) break;
      this.dealDamage(best, dmg, b.type, false);
      this.parts.push({ x: src.x, y: src.y, vx: 0, vy: 0, t: 0.15, arc: { x2: best.x, y2: best.y }, col: '#ffe04a' });
      src = best;
    }
  }

  dealDamage(e, dmg, type, isCrit) {
    e.hp -= dmg; e.hitT = 0.1;
    const st = this.stats[type] || (this.stats[type] = { lanc: 0, dano: 0 });
    st.dano += dmg;
    if (this.nums.length < 40) this.nums.push({ x: e.x + rnd(-8, 8), y: e.y - 14, v: Math.round(dmg), t: 0.7, crit: isCrit });
    if (e.hp <= 0) this.killEnemy(e, type);
  }

  killEnemy(e, type) {
    this.kills++;
    sfx.kill();
    this.burst(e.x, e.y, '#c96fff', 12);
    for (let i = 0; i < e.xp; i++) this.drops.push({ kind: 'gema', x: e.x + rnd(-10, 10), y: e.y, vy: rnd(20, 50), v: 1 });
    if (Math.random() < 0.55) this.drops.push({ kind: 'moeda', x: e.x, y: e.y, vy: rnd(20, 50), v: e.gold });
    if (e.boss) { this.shake = 8; this.setBanner('CHEFE DERROTADO!'); }
    // peçonha: espalha condições
    if (BALLS[type]?.spread) {
      for (const o of this.enemies) if (o !== e && dist2(o.x, o.y, e.x, e.y) < 110 ** 2) {
        this.applyCond(o, 'bleed', 2, this.d.condMul);
        this.applyCond(o, 'poison', 2, this.d.condMul);
      }
    }
    if (this.char.healOnBleedKill && e.conds.bleed) this.heal(this.char.healOnBleedKill);
  }

  heal(v) { this.hp = clamp(this.hp + v, 0, this.maxHp); }

  updateEnemies(dt) {
    const rm = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) { rm.push(e); continue; }
      e.hitT = Math.max(0, e.hitT - dt);
      e.spawnT = Math.max(0, e.spawnT - dt);
      // formação em grade: todos descem juntos na mesma velocidade
      let spd = e.boss ? e.spd * (1 + this.wave * 0.02) : this.rowSpeed;
      const c = e.conds;
      if (c.slow && (c.slow.t -= dt) > 0) spd *= c.slow.f; else delete c.slow;
      if (c.burn) { if ((c.burn.t -= dt) > 0) this.dot(e, c.burn.dps * dt, 'fogo'); else delete c.burn; }
      if (c.poison) { if ((c.poison.t -= dt) > 0) this.dot(e, e.maxHp * c.poison.pct * dt, 'veneno'); else delete c.poison; }
      if (c.bleed) { if ((c.bleed.t -= dt) > 0) this.dot(e, c.bleed.dps * c.bleed.stacks * dt, 'sangue'); else delete c.bleed; }
      // ZONA DE PERIGO: ao cruzar a linha vermelha o monstro para, telegrafa e golpeia forte
      if (e.y >= DANGER_Y && !e.boss) {
        e.y = Math.min(e.y + spd * dt * 0.25, DANGER_Y + 26);
        e.charge = (e.charge || 0) + dt;
        if (e.charge >= TELEGRAPH) {
          e.charge = 0;
          this.heavyStrike(e);
        }
      } else {
        e.y += spd * dt;
        if (e.charge) e.charge = 0;
      }
      e.x = clamp(e.x, PB.x + 14, PB.x + PB.w - 14);

      // ataques à distância: alguns inimigos disparam flechas/magias
      if (e.ranged && e.y > AR.y + 10) {
        e.shotT = (e.shotT === undefined ? rnd(0.5, e.ranged.cd) : e.shotT) - dt;
        if (e.shotT <= 0) { e.shotT = e.ranged.cd * rnd(0.85, 1.2); this.foeShoot(e); }
      }

      // contato direto com o herói
      const er = e.boss ? 34 : 15;
      if (dist2(e.x, e.y, this.x, this.y) < (er + 12) ** 2) {
        this.hurtHero(e.dmg);
        if (!e.boss) e.y -= 34;
      }
      // chefe cruzando o fundo
      if (e.boss && e.y > AR.y + AR.h - 12) { e.y -= 60; this.hurtHero(e.dmg); }
    }
    for (const e of rm) this.enemies.splice(this.enemies.indexOf(e), 1);
  }

  // golpe pesado da zona de perigo (dano significativo)
  heavyStrike(e) {
    const dmg = e.dmg * 2.2;
    this.hurtHero(dmg, true);
    this.burst(this.x, this.y, '#ff3a5a', 16);
    this.shake = 10;
    this.parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, t: 0.25, arc: { x2: this.x, y2: this.y }, col: '#ff3a5a' });
  }

  // flechas e magias dos inimigos
  foeShoot(e) {
    const dx = this.x - e.x, dy = this.y - e.y;
    const l = Math.hypot(dx, dy) || 1;
    const R = e.ranged;
    this.foeShots.push({
      x: e.x, y: e.y + 8, vx: (dx / l) * R.vel, vy: (dy / l) * R.vel,
      dano: R.dano * (1 + this.wave * 0.05), tipo: R.tipo, t: 4,
    });
  }

  updateFoeShots(dt) {
    const rm = [];
    for (const s of this.foeShots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt;
      if (s.t <= 0 || s.y > AR.y + AR.h || s.y < AR.y - 20 || s.x < PB.x - 20 || s.x > PB.x + PB.w + 20) { rm.push(s); continue; }
      if (dist2(s.x, s.y, this.x, this.y) < 13 ** 2) {
        this.hurtHero(s.dano);
        this.burst(s.x, s.y, s.tipo === 'flecha' ? '#e8d0a0' : '#c96fff', 8);
        rm.push(s);
      }
    }
    for (const s of rm) this.foeShots.splice(this.foeShots.indexOf(s), 1);
  }

  hurtHero(dmg, pesado) {
    if (this.invulnT > 0) return;
    this.hp -= dmg;
    this.invulnT = pesado ? 0.9 : 0.7;
    this.shake = Math.max(this.shake, pesado ? 10 : 6);
    this.nums.push({ x: this.x, y: this.y - 22, v: Math.round(dmg), t: 0.9, crit: !!pesado, foe: true });
    sfx.hurt(); if (this.cfg.haptico) buzz(pesado ? 140 : 60);
    if (this.hp <= 0) { this.hp = 0; this.state = 'over'; this.overT = 1.4; sfx.lose(); }
  }

  dot(e, dmg, type) {
    e.hp -= dmg;
    const st = this.stats[type] || (this.stats[type] = { lanc: 0, dano: 0 });
    st.dano += dmg;
    if (e.hp <= 0) this.killEnemy(e, type);
  }

  updateDrops(dt) {
    const rm = [];
    for (const d of this.drops) {
      // cai até o chão e espera o herói buscar
      if (d.y < AR.y + AR.h - 16) d.y += d.vy * dt;
      else { d.rest = (d.rest || 0) + dt; if (d.rest > 9) rm.push(d); }
      const dd = dist2(d.x, d.y, this.x, this.y);
      if (dd < this.magnet ** 2) {
        const l = Math.sqrt(dd) || 1;
        d.x += (this.x - d.x) / l * 280 * dt;
        d.y += (this.y - d.y) / l * 280 * dt;
      }
      if (dd < 20 ** 2) {
        rm.push(d);
        if (d.kind === 'gema') { this.gainXp(d.v); sfx.gem(); }
        else { this.gold += d.v; sfx.coin(); }
      }
    }
    for (const d of rm) this.drops.splice(this.drops.indexOf(d), 1);
  }

  updatePools(dt) {
    for (const p of this.pools) {
      p.t -= dt;
      for (const e of this.enemies) if (dist2(e.x, e.y, p.x, p.y) < p.r ** 2) this.dot(e, p.dps * dt, 'magma');
    }
    this.pools = this.pools.filter(p => p.t > 0);
  }

  gainXp(v) {
    this.xp += v;
    if (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = 6 + this.level * 4;
      this.openLevelUp();
    }
  }

  // ---------------- level up ----------------
  openLevelUp() {
    sfx.levelup(); buzz([30, 40, 30]);
    this.state = 'levelup';
    this.rerolls = 1;
    this.cards = this.genCards();
  }

  genCards() {
    const n = this.char.cards4 ? 4 : 3;
    const opts = [];
    // fusão disponível?
    for (const f of FUSIONS) {
      const a = this.slots.find(s => s.type === f.a && s.level >= 3);
      const b = this.slots.find(s => s.type === f.b && s.level >= 3);
      if (a && b) opts.push({ kind: 'fusion', f, peso: 100 });
    }
    // novas esferas
    if (this.slots.length < MAX_SLOTS) {
      for (const t of ['fogo', 'gelo', 'sangue', 'veneno', 'raio', 'ferro', 'vento'])
        if (!this.slots.some(s => s.type === t)) opts.push({ kind: 'new', t, peso: 3 });
    }
    // melhorias de esferas
    for (const s of this.slots) {
      opts.push({ kind: 'up', s, peso: 4 });
      if (s.count < 5) opts.push({ kind: 'baby', s, peso: 2 });
    }
    // passivas
    opts.push({ kind: 'p_fire', peso: 3 }, { kind: 'p_move', peso: 2 }, { kind: 'p_crit', peso: 2 },
              { kind: 'p_hp', peso: 3 }, { kind: 'p_magnet', peso: 2 }, { kind: 'p_vel', peso: 2 });
    // sorteio ponderado sem repetição
    const out = [];
    while (out.length < n && opts.length) {
      const tot = opts.reduce((a, o) => a + o.peso, 0);
      let r = rnd(tot);
      let idx = 0;
      for (; idx < opts.length; idx++) { r -= opts[idx].peso; if (r <= 0) break; }
      out.push(opts.splice(Math.min(idx, opts.length - 1), 1)[0]);
    }
    return out;
  }

  cardInfo(c) {
    if (c.kind === 'fusion') {
      const O = BALLS[c.f.out];
      return { titulo: `FUSÃO: ${O.nome}`, desc: `${BALLS[c.f.a].nome} + ${BALLS[c.f.b].nome} → ${O.desc}`, cor: O.cor, star: true };
    }
    if (c.kind === 'new') { const B = BALLS[c.t]; return { titulo: `Nova: ${B.nome}`, desc: B.desc, cor: B.cor }; }
    if (c.kind === 'up') { const B = BALLS[c.s.type]; return { titulo: `${B.nome} nv.${c.s.level + 1}`, desc: '+25% de dano desta esfera.', cor: B.cor }; }
    if (c.kind === 'baby') { const B = BALLS[c.s.type]; return { titulo: `Esfera-bebê: ${B.nome}`, desc: '+1 esfera simultânea deste tipo.', cor: B.cor }; }
    const P = {
      p_fire: ['Gatilho Rápido', '+12% taxa de disparo', '#f5c56a'],
      p_move: ['Botas Ágeis', '+12% velocidade de movimento', '#7ce8d0'],
      p_crit: ['Olho Afiado', '+4% chance de crítico', '#ff8ae8'],
      p_hp: ['Coração de Pedra', '+12 PV máx. e cura 12', '#e84a6f'],
      p_magnet: ['Ímã de Gemas', '+45 raio de coleta', '#e042c8'],
      p_vel: ['Câmara Polida', '+10% velocidade das esferas', '#c8d8ff'],
    }[c.kind];
    return { titulo: P[0], desc: P[1], cor: P[2] };
  }

  applyCard(c) {
    if (c.kind === 'fusion') {
      const ia = this.slots.findIndex(s => s.type === c.f.a);
      const ib = this.slots.findIndex(s => s.type === c.f.b);
      const count = Math.max(this.slots[ia].count, this.slots[ib].count);
      const keep = Math.min(ia, ib);
      const rem = Math.max(ia, ib);
      this.slots.splice(rem, 1);
      this.slots[keep] = { type: c.f.out, level: 1, count, inFlight: 0 };
      // remove bolas em voo dos tipos fundidos
      this.balls = this.balls.filter(b => b.frag || (b.slot && this.slots.includes(b.slot)));
      sfx.fusion(); buzz([40, 30, 40, 30, 90]);
      this.setBanner(`FUSÃO! ${BALLS[c.f.out].nome}`);
    }
    else if (c.kind === 'new') this.slots.push({ type: c.t, level: 1, count: 1, inFlight: 0 });
    else if (c.kind === 'up') c.s.level++;
    else if (c.kind === 'baby') c.s.count++;
    else if (c.kind === 'p_fire') this.bonus.fire *= 1.12;
    else if (c.kind === 'p_move') this.bonus.move *= 1.12;
    else if (c.kind === 'p_crit') this.bonus.crit += 0.04;
    else if (c.kind === 'p_hp') { this.maxHp += 12; this.heal(12); }
    else if (c.kind === 'p_magnet') this.magnet += 45;
    else if (c.kind === 'p_vel') this.bonus.vel *= 1.10;
    this.state = 'play';
  }

  burst(x, y, col, n) {
    for (let i = 0; i < n && this.parts.length < 220; i++) {
      const a = rnd(Math.PI * 2), v = rnd(30, 130);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: rnd(0.2, 0.5), col });
    }
  }

  finish(win) {
    const totalDmg = Object.values(this.stats).reduce((a, s) => a + s.dano, 0);
    this.game.switch('results', {
      char: this.char, win, wave: this.wave, kills: this.kills, gold: this.gold,
      time: this.timeAlive, stats: this.stats, totalDmg,
    });
  }

  // ---------------- render ----------------
  render(ctx) {
    ctx.save();
    if (this.shake > 0) ctx.translate(rnd(-this.shake, this.shake), rnd(-this.shake, this.shake));
    ctx.fillStyle = PAL.bg; ctx.fillRect(-10, -10, W + 20, H + 20);

    // laterais
    this.renderSide(ctx);

    // arena com cores do bioma da fase
    const bio = this.biome();
    const grd = ctx.createLinearGradient(0, AR.y, 0, AR.y + AR.h);
    grd.addColorStop(0, bio.arena[0]); grd.addColorStop(1, bio.arena[1]);
    ctx.fillStyle = grd; ctx.fillRect(AR.x, AR.y, AR.w, AR.h);
    // faixas laterais temáticas (natureza da fase)
    for (const sx of [AR.x, AR.x + AR.w - STRIP]) {
      const sg = ctx.createLinearGradient(sx, 0, sx + STRIP, 0);
      sg.addColorStop(sx === AR.x ? 0 : 1, bio.stripDark);
      sg.addColorStop(sx === AR.x ? 1 : 0, bio.strip);
      ctx.fillStyle = sg; ctx.fillRect(sx, AR.y, STRIP, AR.h);
      for (let i = 0; i < 8; i++) {
        const dy = AR.y + 30 + i * 64 + ((i * 37) % 23);
        this.drawDeco(ctx, sx + STRIP / 2 + ((i * 13) % 7) - 3, dy, bio.deco);
      }
      ctx.strokeStyle = '#00000055'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx === AR.x ? sx + STRIP + 0.5 : sx - 0.5, AR.y);
      ctx.lineTo(sx === AR.x ? sx + STRIP + 0.5 : sx - 0.5, AR.y + AR.h);
      ctx.stroke();
    }
    // marcas da estrada em movimento (o grupo avança pelo caminho)
    ctx.fillStyle = '#ffffff10';
    for (let y = AR.y - 48 + this.roadY; y < AR.y + AR.h; y += 48)
      ctx.fillRect(PB.x + PB.w / 2 - 2, Math.max(AR.y, y), 4, Math.min(22, AR.y + AR.h - y));
    ctx.strokeStyle = PAL.border; ctx.lineWidth = 3;
    ctx.strokeRect(AR.x - 1.5, AR.y - 1.5, AR.w + 3, AR.h + 3);
    // ZONA DE PERIGO: sem linha desenhada — só um brilho de alerta quando
    // algum monstro está carregando o golpe (o aviso real fica no monstro)
    const perigo = this.enemies.some(e => e.charge > 0);
    if (perigo) {
      const gp = ctx.createLinearGradient(0, DANGER_Y, 0, AR.y + AR.h);
      const inten = 0.10 + Math.abs(Math.sin(this.game.time * 9)) * 0.16;
      gp.addColorStop(0, 'rgba(232,60,80,0)');
      gp.addColorStop(1, `rgba(232,60,80,${inten})`);
      ctx.fillStyle = gp;
      ctx.fillRect(PB.x, DANGER_Y, PB.w, AR.y + AR.h - DANGER_Y);
    }

    // poças
    for (const p of this.pools) {
      ctx.fillStyle = `rgba(255,90,44,${0.25 * Math.min(1, p.t)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    // drops
    for (const d of this.drops) drawSprite(ctx, d.kind, d.x, d.y, 2);

    // inimigos: a plataforma de nascimento marca a formação e desvanece
    for (const e of this.enemies) {
      if (!e.boss && e.spawnT > 0) this.drawSpawnPad(ctx, e.x, e.y + 14, e.spawnT);
      if (e.hitT > 0) { ctx.globalAlpha = 0.7; }
      drawSprite(ctx, e.spr, e.x, e.y, e.scale);
      ctx.globalAlpha = 1;
      const er = e.boss ? 36 : 16;
      if (e.hp < e.maxHp && !e.boss) bar(ctx, e.x - 14, e.y - er - 6, 28, 4, e.hp / e.maxHp, PAL.hp);
      // telegrafia do golpe pesado: anel vermelho fechando + aviso
      if (e.charge > 0) {
        const f = e.charge / TELEGRAPH;
        ctx.strokeStyle = '#ff3a5a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, 26 - f * 12, 0, Math.PI * 2 * f); ctx.stroke();
        ctx.lineWidth = 1;
        if (f > 0.65 && Math.floor(this.game.time * 10) % 2 === 0)
          text(ctx, '!', e.x, e.y - er - 20, { align: 'center', size: 16, bold: true, color: '#ff3a5a' });
      }
      // ícones de condição
      let ci = 0;
      const condCols = { burn: '#ff7a3c', slow: '#6fd0ff', poison: '#7cd046', bleed: '#e8425a' };
      for (const k of Object.keys(e.conds)) {
        ctx.fillStyle = condCols[k] || '#fff';
        ctx.fillRect(e.x - 10 + ci * 7, e.y + er + 3, 5, 5);
        ci++;
      }
    }

    // esferas com rastro pontilhado
    for (const b of this.balls) {
      const cor = BALLS[b.type].cor;
      if (b.trail) {
        for (let i = 0; i < b.trail.length; i += 2) {
          const f = (i / 2) / (b.trail.length / 2);
          ctx.globalAlpha = f * 0.5;
          ctx.fillStyle = cor;
          const s = 1 + f * 2;
          ctx.fillRect(b.trail[i] - s / 2, b.trail[i + 1] - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
      }
      const img = ballSprite(cor, b.r);
      ctx.drawImage(img, b.x - img.width / 2, b.y - img.height / 2);
    }

    // herói (pisca quando invulnerável)
    if (!(this.invulnT > 0 && Math.floor(this.game.time * 14) % 2 === 0))
      drawSprite(ctx, this.char.spr, this.x, this.y, 2);
    // retícula na mira (manual ou automática) + linha de disparo
    const ap = this.aimPoint();
    ctx.strokeStyle = '#ffffff2e'; ctx.setLineDash([3, 7]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.x, this.y - 8); ctx.lineTo(ap.x, ap.y); ctx.stroke();
    ctx.setLineDash([]);
    this.drawReticle(ctx, ap.x, ap.y, !ap.auto);

    // flechas e magias inimigas
    for (const s of this.foeShots) {
      if (s.tipo === 'flecha') {
        const a = Math.atan2(s.vy, s.vx);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
        ctx.fillStyle = '#e8d0a0'; ctx.fillRect(-7, -1.5, 14, 3);
        ctx.fillStyle = '#8a6f4a'; ctx.fillRect(5, -3, 4, 6);
        ctx.restore();
      } else {
        const r = 6 + Math.sin(this.game.time * 14) * 1.2;
        const gg = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, r);
        gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.5, '#c96fff'); gg.addColorStop(1, '#5c1a8a00');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // partículas
    for (const p of this.parts) {
      if (p.arc) {
        ctx.strokeStyle = p.col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.arc.x2, p.arc.y2); ctx.stroke();
      } else {
        ctx.fillStyle = p.col; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
    // números de dano com contorno (legíveis sobre qualquer fundo)
    for (const n of this.nums) {
      const s = n.crit ? 17 : 12;
      ctx.font = `bold ${s}px "Courier New", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.globalAlpha = Math.min(1, n.t * 2.2);
      const str = n.foe ? '-' + n.v : (n.crit ? n.v + '!' : String(n.v));
      ctx.lineWidth = 3; ctx.strokeStyle = '#000000cc';
      ctx.strokeText(str, n.x, n.y);
      ctx.fillStyle = n.foe ? '#ff5a6a' : (n.crit ? PAL.gold : '#ffffff');
      ctx.fillText(str, n.x, n.y);
      ctx.globalAlpha = 1;
    }

    // barra de chefe
    const boss = this.enemies.find(e => e.boss);
    if (boss) {
      bar(ctx, AR.x + 30, AR.y + 10, AR.w - 60, 10, boss.hp / boss.maxHp, '#a03cff');
      text(ctx, boss.nome, AR.x + AR.w / 2, AR.y + 24, { align: 'center', size: 12, color: '#d0a0ff', bold: true });
    }

    // banner
    if (this.bannerT > 0 && this.banner) {
      ctx.globalAlpha = Math.min(1, this.bannerT);
      panel(ctx, AR.x + 40, 200, AR.w - 80, 56, {});
      text(ctx, this.banner, AR.x + AR.w / 2, 220, { align: 'center', size: 18, bold: true, color: PAL.gold });
      ctx.globalAlpha = 1;
    }

    // guia dos lados de controle (aparece enquanto os dedos estão na tela)
    if (this.cfg.modo === 'split' && this.game.touches && this.game.touches.size) {
      const moveEsq = !this.cfg.canhoto;
      for (const t of this.game.touches.values()) {
        const naEsq = t.startX < W / 2;
        const ehMove = naEsq === moveEsq;
        ctx.strokeStyle = ehMove ? '#7ce8d066' : '#f5c56a66';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.x, t.y, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }

    ctx.restore();

    if (this.state === 'levelup') this.renderLevelUp(ctx);
    if (this.state === 'pause') this.renderPause(ctx);
    if (this.state === 'over' || this.state === 'won') {
      ctx.fillStyle = this.state === 'won' ? '#f5c56a22' : '#e8425a33';
      ctx.fillRect(0, 0, W, H);
      text(ctx, this.state === 'won' ? 'ABISMO SELADO!' : 'VOCÊ CAIU...', W / 2, H / 2 - 20, { align: 'center', size: 32, bold: true, color: this.state === 'won' ? PAL.gold : PAL.hp });
    }
  }

  // plataforma de nascimento: revela a formação em grade e some
  drawSpawnPad(ctx, x, y, t) {
    const a = Math.min(1, t / 1.6) * 0.55;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#6b4a33'; ctx.fillRect(x - 15, y - 5, 30, 11);
    ctx.fillStyle = '#8a6f4a'; ctx.fillRect(x - 15, y - 5, 30, 3);
    ctx.strokeStyle = '#3a2617'; ctx.lineWidth = 1;
    ctx.strokeRect(x - 14.5, y - 4.5, 29, 10);
    ctx.globalAlpha = 1;
  }

  // retícula de mira (dourada quando o jogador está mirando manualmente)
  drawReticle(ctx, x, y, manual) {
    const r = 13, t = this.game.time * 2;
    ctx.strokeStyle = manual ? PAL.gold : '#ffffffcc'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a0 = t + i * Math.PI / 2 + 0.35, a1 = a0 + 0.7;
      ctx.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
      ctx.arc(x, y, r, a0, a1);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
    ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);
    ctx.stroke();
  }

  // decorações de natureza das faixas laterais
  drawDeco(ctx, x, y, tipo) {
    if (tipo === 'arvore') {
      ctx.fillStyle = '#3a2617'; ctx.fillRect(x - 2, y + 8, 4, 7);
      ctx.fillStyle = '#2c5e3a';
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x - 9, y + 2); ctx.lineTo(x + 9, y + 2); ctx.fill();
      ctx.fillStyle = '#37714a';
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x - 11, y + 10); ctx.lineTo(x + 11, y + 10); ctx.fill();
    } else if (tipo === 'cacto') {
      ctx.fillStyle = '#4a7c3a';
      ctx.fillRect(x - 3, y - 10, 6, 22);
      ctx.fillRect(x - 10, y - 4, 7, 4); ctx.fillRect(x - 10, y - 10, 4, 8);
      ctx.fillRect(x + 3, y + 0, 7, 4); ctx.fillRect(x + 6, y - 6, 4, 8);
      ctx.fillStyle = '#5c9448'; ctx.fillRect(x - 1, y - 10, 2, 22);
    } else if (tipo === 'pico') {
      ctx.fillStyle = '#5c6784';
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x - 12, y + 10); ctx.lineTo(x + 12, y + 10); ctx.fill();
      ctx.fillStyle = '#e8ecf5';
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x - 4, y - 5); ctx.lineTo(x + 4, y - 5); ctx.fill();
    }
  }

  renderSide(ctx) {
    // painel esquerdo: herói
    panel(ctx, 8, 8, 236, 250);
    drawSprite(ctx, this.char.spr, 40, 44, 4);
    text(ctx, this.char.nome, 76, 24, { size: 15, bold: true, color: PAL.gold });
    text(ctx, `Onda ${this.wave}/${FINAL_WAVE} · ${this.biome().nome}`, 76, 44, { size: 12 });
    text(ctx, `PV`, 20, 84, { size: 12 });
    bar(ctx, 50, 84, 170, 12, this.hp / this.maxHp, PAL.hp);
    text(ctx, `${Math.ceil(this.hp)}/${this.maxHp}`, 135, 84, { size: 10, align: 'center', color: '#fff' });
    text(ctx, `XP`, 20, 102, { size: 12 });
    bar(ctx, 50, 102, 170, 12, this.xp / this.xpNext, PAL.xp);
    text(ctx, `Nível ${this.level}`, 135, 102, { size: 10, align: 'center', color: '#fff' });
    drawSprite(ctx, 'moeda', 28, 132, 2);
    text(ctx, fmt(this.gold), 44, 126, { size: 14, color: PAL.gold });
    text(ctx, `Abates: ${this.kills}`, 120, 126, { size: 13 });
    text(ctx, `Tempo: ${Math.floor(this.timeAlive / 60)}:${String(Math.floor(this.timeAlive % 60)).padStart(2, '0')}`, 20, 148, { size: 12, color: PAL.textDim });
    text(ctx, 'ESC pausa · M muta', 20, 236, { size: 11, color: PAL.textDim });

    // painel direito: esferas equipadas com DPS ao vivo
    panel(ctx, 716, 8, 236, 320);
    text(ctx, 'Esferas', 834, 20, { align: 'center', size: 15, bold: true, color: PAL.gold });
    let y = 46;
    for (const s of this.slots) {
      const B = BALLS[s.type];
      const img = ballSprite(B.cor, 8);
      ctx.drawImage(img, 728, y - 2);
      text(ctx, `${B.nome} nv.${s.level}`, 752, y, { size: 12, bold: true, color: B.cor });
      const st = this.stats[s.type];
      const dps = st ? st.dano / Math.max(1, this.timeAlive) : 0;
      text(ctx, `×${s.count}  DPS ${dps.toFixed(1)}`, 752, y + 14, { size: 11, color: PAL.textDim });
      y += 38;
    }
    // dica de fusão
    for (const f of FUSIONS) {
      const a = this.slots.find(s => s.type === f.a), b = this.slots.find(s => s.type === f.b);
      if (a && b) {
        const ok = a.level >= 3 && b.level >= 3;
        text(ctx, `${BALLS[f.a].nome}+${BALLS[f.b].nome} → ${BALLS[f.out].nome}${ok ? ' PRONTA!' : ' (nv.3+3)'}`,
          728, y, { size: 10, color: ok ? PAL.good : PAL.textDim });
        y += 14;
      }
    }
  }

  renderLevelUp(ctx) {
    ctx.fillStyle = '#000000aa'; ctx.fillRect(0, 0, W, H);
    text(ctx, `NÍVEL ${this.level}! Escolha uma carta`, W / 2, 70, { align: 'center', size: 22, bold: true, color: PAL.gold });
    const n = this.cards.length;
    const cw = 200, gap = 24;
    const x0 = W / 2 - (n * cw + (n - 1) * gap) / 2;
    this.cards.forEach((c, i) => {
      const info = this.cardInfo(c);
      const x = x0 + i * (cw + gap), y = 120, h = 250;
      panel(ctx, x, y, cw, h, { border: info.star ? PAL.gold : PAL.border });
      const img = ballSprite(info.cor, 16);
      ctx.drawImage(img, x + cw / 2 - 17, y + 24);
      text(ctx, info.titulo, x + cw / 2, y + 70, { align: 'center', size: 14, bold: true, color: info.cor });
      // descrição com quebra
      const words = info.desc.split(' ');
      let line = '', ly = y + 100;
      ctx.font = '12px "Courier New", monospace';
      for (const w2 of words) {
        if (ctx.measureText(line + w2).width > cw - 30) { text(ctx, line, x + cw / 2, ly, { align: 'center', size: 12 }); line = w2 + ' '; ly += 16; }
        else line += w2 + ' ';
      }
      text(ctx, line, x + cw / 2, ly, { align: 'center', size: 12 });
      if (button(this.game, ctx, 'card' + i, 'Escolher', x + 20, y + h - 48, cw - 40, 34)) {
        sfx.click(); this.applyCard(c);
      }
    });
    if (this.rerolls > 0) {
      if (button(this.game, ctx, 'reroll', `Rerolar (${this.rerolls})`, W / 2 - 90, 400, 180, 36)) {
        this.rerolls--; this.cards = this.genCards(); sfx.click();
      }
    }
  }

  renderPause(ctx) {
    ctx.fillStyle = '#000000aa'; ctx.fillRect(0, 0, W, H);
    panel(ctx, W / 2 - 190, 96, 380, 350);
    text(ctx, 'PAUSA', W / 2, 112, { align: 'center', size: 22, bold: true, color: PAL.gold });
    // controles editáveis durante a partida
    drawControlOptions(this.game, ctx, W / 2 - 165, 150, 330, this.cfg);
    if (button(this.game, ctx, 'resume', 'Continuar', W / 2 - 165, 344, 330, 38)) this.state = 'play';
    if (button(this.game, ctx, 'giveup', 'Abandonar run', W / 2 - 165, 392, 330, 34, { size: 12 })) { this.state = 'over'; this.overT = 0.1; }
  }
}
