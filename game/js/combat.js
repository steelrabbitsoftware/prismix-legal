// Cena de combate: a Run no Abismo
import { W, H, PAL, panel, text, button, bar, rnd, irnd, pick, clamp, dist2, fmt } from './engine.js';
import { drawSprite, ballSprite, shade } from './sprites.js';
import { BALLS, FUSIONS, ENEMIES, waveSpec, derive } from './data.js';
import { sfx } from './audio.js';
import * as SAVE from './save.js';

const AR = { x: 252, y: 6, w: 456, h: 528 };       // arena
const FLOOR = AR.y + AR.h - 30;                     // linha do herói
const MAX_SLOTS = 4;
const FINAL_WAVE = 15;

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
    this.level = 1; this.xp = 0; this.xpNext = 6;
    this.gold = 0; this.kills = 0; this.timeAlive = 0;
    this.magnet = 95;
    this.bonus = { fire: 1, move: 1, crit: 0, vel: 1, dmg: 1 };
    this.slots = [{ type: char.ball, level: 1, count: this.d.babyCount, inFlight: 0 }];
    if (char.extraBall) {
      const t = pick(['fogo', 'gelo', 'sangue', 'veneno', 'raio', 'ferro', 'vento']);
      this.slots.push({ type: t, level: 1, count: this.d.babyCount, inFlight: 0 });
    }
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

  // ---------------- ondas ----------------
  nextWave() {
    this.wave++;
    const spec = waveSpec(this.wave);
    this.hpMul = spec.hpMul;
    this.spawnQueue = [];
    if (spec.boss) {
      this.spawnQueue.push('boss');
      for (let i = 0; i < Math.floor(spec.count / 2); i++) this.spawnQueue.push(this.pickType(spec));
      sfx.boss();
      this.setBanner(this.wave % 15 === 0 ? 'O OLHO FINAL DO ABISMO' : 'CHEFE: OLHO DO ABISMO');
    } else {
      for (let i = 0; i < spec.count; i++) this.spawnQueue.push(this.pickType(spec));
      this.setBanner(`Onda ${this.wave}`);
    }
    this.spawnT = 0.5;
  }

  pickType(spec) {
    const tot = spec.pool.reduce((a, p) => a + p[1], 0);
    let r = rnd(tot);
    for (const [t, w] of spec.pool) { r -= w; if (r <= 0) return t; }
    return 'slime';
  }

  setBanner(msg) { this.banner = msg; this.bannerT = 2.2; }

  spawnEnemy(type) {
    const E = ENEMIES[type];
    const boss = !!E.boss;
    const hp = E.hp * this.hpMul * (boss ? 1 + this.wave / 10 : 1);
    this.enemies.push({
      type, ...E, hp, maxHp: hp,
      x: boss ? AR.x + AR.w / 2 : rnd(AR.x + 30, AR.x + AR.w - 30),
      y: -30, phase0: rnd(Math.PI * 2),
      conds: {}, hitT: 0,
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

    // herói
    let mv = 0;
    if (g.key('ArrowLeft') || g.key('KeyA')) mv -= 1;
    if (g.key('ArrowRight') || g.key('KeyD')) mv += 1;
    if (mv === 0 && g.pointer.down && g.pointer.y > FLOOR - 40) {
      mv = clamp((g.pointer.x - this.x) / 30, -1, 1);
    }
    this.x = clamp(this.x + mv * this.d.moveSpd * this.bonus.move * dt, AR.x + 16, AR.x + AR.w - 16);

    // disparo
    this.fireT += dt;
    const interval = 1 / (this.d.fireRate * this.bonus.fire);
    while (this.fireT >= interval) {
      this.fireT -= interval;
      this.fireBall();
    }

    // spawn de inimigos
    if (this.spawnQueue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnEnemy(this.spawnQueue.shift());
        this.spawnT = this.spawnQueue.length && this.enemies.some(e => e.boss) ? 1.4 : 0.75 - Math.min(0.45, this.wave * 0.03);
      }
    } else if (!this.enemies.length) {
      if (this.wave >= FINAL_WAVE) { this.state = 'won'; this.overT = 1.6; sfx.win(); return; }
      this.heal(8); // respiro entre ondas
      this.nextWave();
    }

    this.updateBalls(dt);
    this.updateEnemies(dt);
    this.updateDrops(dt);
    this.updatePools(dt);

    // partículas / números
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
    this.parts = this.parts.filter(p => p.t > 0);
    for (const n of this.nums) { n.y -= 26 * dt; n.t -= dt; }
    this.nums = this.nums.filter(n => n.t > 0);
  }

  aimDir() {
    const g = this.game;
    let dx = g.pointer.x - this.x, dy = g.pointer.y - (FLOOR - 8);
    if (dy > -20) dy = -20;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
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
        // mira assistida: corrige 35% em direção ao inimigo vivo mais próximo
        let best = null, bd = Infinity;
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.y < AR.y) continue;
          const d = dist2(e.x, e.y, this.x, FLOOR - 10);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) {
          const ta = Math.atan2(best.y - (FLOOR - 10), best.x - this.x);
          let diff = ta - ang;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          ang += diff * 0.35;
        }
        ang += rnd(-0.09, 0.09); // dispersão natural: evita coluna única
        if (this.char.spread) ang += rnd(-this.char.spread, this.char.spread);
        const v = B.vel * this.d.ballVel * this.bonus.vel;
        this.balls.push({
          slot: s, type: s.type, x: this.x, y: FLOOR - 10,
          vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
          r: B.fusion ? 8 : 6.5, pierce: this.char.pierce || 0, bounces: 0,
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
      if (b.x < AR.x + b.r) { b.x = AR.x + b.r; b.vx = Math.abs(b.vx); b.bounces++; }
      if (b.x > AR.x + AR.w - b.r) { b.x = AR.x + AR.w - b.r; b.vx = -Math.abs(b.vx); b.bounces++; }
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
      let spd = e.spd * (1 + this.wave * 0.02);
      const c = e.conds;
      if (c.slow && (c.slow.t -= dt) > 0) spd *= c.slow.f; else delete c.slow;
      if (c.burn) { if ((c.burn.t -= dt) > 0) this.dot(e, c.burn.dps * dt, 'fogo'); else delete c.burn; }
      if (c.poison) { if ((c.poison.t -= dt) > 0) this.dot(e, e.maxHp * c.poison.pct * dt, 'veneno'); else delete c.poison; }
      if (c.bleed) { if ((c.bleed.t -= dt) > 0) this.dot(e, c.bleed.dps * c.bleed.stacks * dt, 'sangue'); else delete c.bleed; }
      e.y += spd * dt;
      if (e.zig) e.x += Math.sin(this.timeAlive * 3 + e.phase0) * 40 * dt;
      e.x = clamp(e.x, AR.x + 14, AR.x + AR.w - 14);
      // chegou na linha do herói
      if (e.y > FLOOR - 14) {
        if (!this.invulnT || this.invulnT <= 0) {
          this.hp -= e.dmg;
          this.invulnT = 0.6;
          this.shake = 6;
          sfx.hurt();
          if (this.hp <= 0) { this.hp = 0; this.state = 'over'; this.overT = 1.4; sfx.lose(); }
        }
        e.y -= e.boss ? 60 : 140;
      }
    }
    for (const e of rm) this.enemies.splice(this.enemies.indexOf(e), 1);
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
      d.y += d.vy * dt;
      const dd = dist2(d.x, d.y, this.x, FLOOR - 8);
      if (dd < this.magnet ** 2) {
        const l = Math.sqrt(dd) || 1;
        d.x += (this.x - d.x) / l * 260 * dt;
        d.y += (FLOOR - 8 - d.y) / l * 260 * dt;
      }
      if (dd < 20 ** 2) {
        rm.push(d);
        if (d.kind === 'gema') { this.gainXp(d.v); sfx.gem(); }
        else { this.gold += d.v; sfx.coin(); }
      } else if (d.y > AR.y + AR.h + 10) rm.push(d);
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
    sfx.levelup();
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
      sfx.fusion();
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

    // arena
    const grd = ctx.createLinearGradient(0, AR.y, 0, AR.y + AR.h);
    grd.addColorStop(0, '#170b28'); grd.addColorStop(1, '#2e1c46');
    ctx.fillStyle = grd; ctx.fillRect(AR.x, AR.y, AR.w, AR.h);
    ctx.strokeStyle = PAL.border; ctx.lineWidth = 3;
    ctx.strokeRect(AR.x - 1.5, AR.y - 1.5, AR.w + 3, AR.h + 3);
    // linha do herói
    ctx.strokeStyle = '#e8a0bf55'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(AR.x, FLOOR); ctx.lineTo(AR.x + AR.w, FLOOR); ctx.stroke();
    ctx.setLineDash([]);

    // poças
    for (const p of this.pools) {
      ctx.fillStyle = `rgba(255,90,44,${0.25 * Math.min(1, p.t)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    // drops
    for (const d of this.drops) drawSprite(ctx, d.kind, d.x, d.y, 2);

    // inimigos
    for (const e of this.enemies) {
      if (e.hitT > 0) { ctx.globalAlpha = 0.7; }
      drawSprite(ctx, e.spr, e.x, e.y, e.scale);
      ctx.globalAlpha = 1;
      const er = e.boss ? 36 : 16;
      if (e.hp < e.maxHp && !e.boss) bar(ctx, e.x - 14, e.y - er - 6, 28, 4, e.hp / e.maxHp, PAL.hp);
      // ícones de condição
      let ci = 0;
      const condCols = { burn: '#ff7a3c', slow: '#6fd0ff', poison: '#7cd046', bleed: '#e8425a' };
      for (const k of Object.keys(e.conds)) {
        ctx.fillStyle = condCols[k] || '#fff';
        ctx.fillRect(e.x - 10 + ci * 7, e.y + er + 3, 5, 5);
        ci++;
      }
    }

    // esferas
    for (const b of this.balls) {
      const img = ballSprite(BALLS[b.type].cor, b.r);
      ctx.drawImage(img, b.x - img.width / 2, b.y - img.height / 2);
    }

    // herói
    drawSprite(ctx, this.char.spr, this.x, FLOOR + 6, 2);
    // mira
    const dir = this.aimDir();
    ctx.strokeStyle = '#ffffff33'; ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.moveTo(this.x, FLOOR - 10);
    ctx.lineTo(this.x + dir.x * 90, FLOOR - 10 + dir.y * 90); ctx.stroke();
    ctx.setLineDash([]);

    // partículas
    for (const p of this.parts) {
      if (p.arc) {
        ctx.strokeStyle = p.col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.arc.x2, p.arc.y2); ctx.stroke();
      } else {
        ctx.fillStyle = p.col; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
    // números de dano
    for (const n of this.nums)
      text(ctx, String(n.v), n.x, n.y, { size: n.crit ? 14 : 11, bold: n.crit, color: n.crit ? PAL.gold : '#fff', align: 'center' });

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

    ctx.restore();

    if (this.state === 'levelup') this.renderLevelUp(ctx);
    if (this.state === 'pause') this.renderPause(ctx);
    if (this.state === 'over' || this.state === 'won') {
      ctx.fillStyle = this.state === 'won' ? '#f5c56a22' : '#e8425a33';
      ctx.fillRect(0, 0, W, H);
      text(ctx, this.state === 'won' ? 'ABISMO SELADO!' : 'VOCÊ CAIU...', W / 2, H / 2 - 20, { align: 'center', size: 32, bold: true, color: this.state === 'won' ? PAL.gold : PAL.hp });
    }
  }

  renderSide(ctx) {
    // painel esquerdo: herói
    panel(ctx, 8, 8, 236, 250);
    drawSprite(ctx, this.char.spr, 40, 44, 4);
    text(ctx, this.char.nome, 76, 24, { size: 15, bold: true, color: PAL.gold });
    text(ctx, `Onda ${this.wave}/${FINAL_WAVE}`, 76, 44, { size: 13 });
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
    panel(ctx, W / 2 - 150, 170, 300, 200);
    text(ctx, 'PAUSA', W / 2, 190, { align: 'center', size: 22, bold: true, color: PAL.gold });
    if (button(this.game, ctx, 'resume', 'Continuar', W / 2 - 110, 236, 220, 38)) this.state = 'play';
    if (button(this.game, ctx, 'giveup', 'Abandonar run', W / 2 - 110, 286, 220, 38)) { this.state = 'over'; this.overT = 0.1; }
  }
}
