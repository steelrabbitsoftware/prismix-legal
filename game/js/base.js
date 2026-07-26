// Cena da Base: cidade na borda do Abismo (construção, colheita, expansão)
import { W, H, PAL, panel, text, button, bar, fmt } from './engine.js';
import { drawSprite, sprite } from './sprites.js';
import { BUILDINGS, CHARS, RES_ICONS, RES_NAMES, upgradeCost } from './data.js';
import { sfx } from './audio.js';
import * as SAVE from './save.js';

const COLS = 12, ROWS = 6, TS = 60;
const GX = (W - COLS * TS) / 2, GY = 84;
const CAP_CYCLES = 5; // ciclos de produção acumuláveis

export class Base {
  enter() {
    this.s = SAVE.load();
    this.sel = null;         // {x,y} célula selecionada
    this.mode = null;        // 'build' | 'info' | 'mercado' | 'abrigo'
    this.msg = null; this.msgT = 0;
    this.applyOffline();
  }

  exit() { SAVE.save(); }

  applyOffline() {
    const now = Date.now();
    const dt = this.s.lastSeen ? Math.min(3600 * 8, (now - this.s.lastSeen) / 1000) : 0;
    for (const b of this.s.edificios) this.tickBuilding(b, dt);
  }

  cellUnlocked(x, y) {
    // desbloqueio em espiral simples: ordem linha a linha a partir do centro
    const order = this.cellOrder();
    const idx = order.findIndex(c => c[0] === x && c[1] === y);
    return idx >= 0 && idx < this.s.plots;
  }

  cellOrder() {
    if (this._order) return this._order;
    const cells = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) cells.push([x, y]);
    const cx = (COLS - 1) / 2, cy = (ROWS - 1) / 2;
    cells.sort((a, b) => (Math.abs(a[0] - cx) + Math.abs(a[1] - cy)) - (Math.abs(b[0] - cx) + Math.abs(b[1] - cy)));
    this._order = cells;
    return cells;
  }

  buildingAt(x, y) { return this.s.edificios.find(b => b.x === x && b.y === y); }

  tickBuilding(b, dt) {
    const B = BUILDINGS[b.tipo];
    if (!B.prod) return;
    b.progress = (b.progress || 0) + dt;
    const time = B.time / (1 + 0.15 * (b.nivel - 1));
    b.acumulado = b.acumulado || {};
    while (b.progress >= time) {
      b.progress -= time;
      for (const [k, v] of Object.entries(B.prod)) {
        const cap = CAP_CYCLES * v * b.nivel;
        b.acumulado[k] = Math.min(cap, (b.acumulado[k] || 0) + v * b.nivel);
      }
    }
  }

  canPay(cost) { return Object.entries(cost).every(([k, v]) => (this.s.recursos[k] || 0) >= v); }
  pay(cost) { for (const [k, v] of Object.entries(cost)) this.s.recursos[k] -= v; SAVE.save(); }

  collect(b) {
    if (!b.acumulado) return 0;
    let got = 0;
    for (const [k, v] of Object.entries(b.acumulado)) {
      if (v >= 1) { this.s.recursos[k] = (this.s.recursos[k] || 0) + Math.floor(v); got += Math.floor(v); b.acumulado[k] = 0; }
    }
    if (got) { sfx.coin(); SAVE.save(); }
    return got;
  }

  setMsg(m) { this.msg = m; this.msgT = 2.5; }

  expandCost() { return Math.floor(40 * Math.pow(1.5, (this.s.plots - 12) / 4)); }

  nextLockedHero() { return CHARS.find(c => !this.s.herois[c.id]); }

  update(dt) {
    for (const b of this.s.edificios) this.tickBuilding(b, dt);
    if (this.msgT > 0) this.msgT -= dt;
  }

  render(ctx) {
    const g = this.game;
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(0, 0, W, H); // terra do abismo
    // textura de fundo
    ctx.fillStyle = '#00000022';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 137) % W, (i * 89) % H, 26, 12);

    // grade
    for (const [x, y] of this.cellOrder()) {
      const px = GX + x * TS, py = GY + y * TS;
      const unlocked = this.cellUnlocked(x, y);
      ctx.fillStyle = unlocked ? '#5c4630' : '#2c2018';
      ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
      ctx.strokeStyle = unlocked ? '#7a5c3e88' : '#00000044';
      ctx.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
      const b = this.buildingAt(x, y);
      if (b) {
        // construções evoluem visualmente com o nível: crescem e ganham ornamentos
        const esc = b.nivel >= 5 ? 5 : b.nivel >= 3 ? 4 : 3;
        if (b.nivel >= 3) {   // base de pedra a partir do nv.3
          ctx.fillStyle = '#6b5f4a'; ctx.fillRect(px + 6, py + TS - 14, TS - 12, 8);
          ctx.fillStyle = '#8a7d63'; ctx.fillRect(px + 6, py + TS - 14, TS - 12, 3);
        }
        if (b.nivel >= 5) {   // aura dourada no nível máximo visual
          ctx.fillStyle = '#f5c56a22';
          ctx.beginPath(); ctx.arc(px + TS / 2, py + TS / 2, TS * 0.46, 0, Math.PI * 2); ctx.fill();
        }
        drawSprite(ctx, BUILDINGS[b.tipo].spr, px + TS / 2, py + TS / 2 - (b.nivel >= 3 ? 3 : 0), esc);
        // estrelas de nível
        for (let i = 0; i < Math.min(5, b.nivel); i++) {
          ctx.fillStyle = PAL.gold;
          ctx.fillRect(px + TS - 7 - i * 6, py + 3, 4, 4);
        }
        // pronto para colher?
        if (b.acumulado && Object.values(b.acumulado).some(v => v >= 1)) {
          const t = Math.sin(g.time * 5) > 0;
          if (t) text(ctx, '!', px + 8, py + 2, { size: 16, bold: true, color: PAL.good });
        }
      }
      if (this.sel && this.sel.x === x && this.sel.y === y) {
        ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2;
        ctx.strokeRect(px + 1.5, py + 1.5, TS - 3, TS - 3);
        ctx.lineWidth = 1;
      }
    }

    // clique na grade
    if (g.pointer.justDown && !this.mode) {
      const cx = Math.floor((g.pointer.x - GX) / TS), cy = Math.floor((g.pointer.y - GY) / TS);
      if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS && g.pointer.y > GY - 4 && g.pointer.y < GY + ROWS * TS + 4) {
        if (this.cellUnlocked(cx, cy)) {
          this.sel = { x: cx, y: cy };
          const b = this.buildingAt(cx, cy);
          if (b) {
            const got = this.collect(b);
            this.mode = 'info';
            if (got) this.setMsg('Colheita recolhida!');
          } else this.mode = 'build';
          sfx.click();
        }
      }
    }

    this.renderTopBar(ctx);
    this.renderToolbar(ctx);

    if (this.mode === 'build') this.renderBuildMenu(ctx);
    if (this.mode === 'info') this.renderInfo(ctx);
    if (this.mode === 'mercado') this.renderMercado(ctx);
    if (this.mode === 'abrigo') this.renderAbrigo(ctx);

    if (this.msgT > 0 && this.msg) {
      panel(ctx, W / 2 - 180, 46, 360, 30);
      text(ctx, this.msg, W / 2, 53, { align: 'center', size: 13, color: PAL.good });
    }
  }

  renderTopBar(ctx) {
    panel(ctx, 0, 0, W, 40, { fill: PAL.panelDark });
    let x = 16;
    for (const [k, ic] of Object.entries(RES_ICONS)) {
      drawSprite(ctx, ic, x + 8, 20, 3);
      text(ctx, fmt(this.s.recursos[k] || 0), x + 22, 12, { size: 15, bold: true, color: k === 'ouro' ? PAL.gold : PAL.text });
      x += 110;
    }
    text(ctx, 'TRAVEL HEROS · A BASE', W - 16, 12, { align: 'right', size: 15, bold: true, color: PAL.border });
  }

  renderToolbar(ctx) {
    const g = this.game;
    panel(ctx, 0, H - 56, W, 56, { fill: PAL.panelDark });
    if (button(g, ctx, 'tb_play', '⚔ DESCER AO ABISMO', 16, H - 46, 220, 36, { color: PAL.gold })) {
      sfx.click(); g.switch('charselect');
    }
    const ec = this.expandCost();
    if (button(g, ctx, 'tb_expand', `Expandir (+4)  ${ec} ouro`, 252, H - 46, 210, 36,
      { disabled: !this.canPay({ ouro: ec }) })) {
      this.pay({ ouro: ec }); this.s.plots += 4; SAVE.save(); sfx.build(); this.setMsg('Terreno expandido!');
    }
    if (button(g, ctx, 'tb_collect', 'Colher tudo', 478, H - 46, 150, 36)) {
      let tot = 0;
      for (const b of this.s.edificios) tot += this.collect(b);
      this.setMsg(tot ? 'Colheita recolhida!' : 'Nada pronto para colher.');
    }
    if (button(g, ctx, 'tb_menu', 'Menu', W - 110, H - 46, 94, 36)) { sfx.click(); g.switch('menu'); }
  }

  closeBtn(ctx, x, y) {
    return button(this.game, ctx, 'close', '✕', x, y, 28, 28, { size: 13 });
  }

  renderBuildMenu(ctx) {
    const g = this.game;
    const bw = 640, bh = 380, bx = W / 2 - bw / 2, by = 70;
    panel(ctx, bx, by, bw, bh);
    text(ctx, 'Construir', bx + bw / 2, by + 14, { align: 'center', size: 18, bold: true, color: PAL.gold });
    if (this.closeBtn(ctx, bx + bw - 40, by + 10)) { this.mode = null; }
    let i = 0;
    for (const [tipo, B] of Object.entries(BUILDINGS)) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = bx + 20 + col * (bw / 2 - 10), y = by + 46 + row * 80;
      panel(ctx, x, y, bw / 2 - 30, 72, { fill: PAL.panelDark });
      drawSprite(ctx, B.spr, x + 34, y + 36, 3);
      text(ctx, B.nome, x + 66, y + 8, { size: 13, bold: true });
      text(ctx, B.desc, x + 66, y + 24, { size: 10, color: PAL.textDim });
      const costStr = Object.entries(B.cost).map(([k, v]) => `${v} ${RES_NAMES[k].toLowerCase()}`).join(' + ');
      text(ctx, costStr, x + 66, y + 38, { size: 10, color: PAL.gold });
      const can = this.canPay(B.cost);
      if (button(g, ctx, 'build_' + tipo, 'Construir', x + bw / 2 - 130, y + 38, 92, 26, { size: 11, disabled: !can })) {
        this.pay(B.cost);
        this.s.edificios.push({ tipo, x: this.sel.x, y: this.sel.y, nivel: 1, progress: 0, acumulado: {} });
        SAVE.save(); sfx.build(); this.mode = null;
        this.setMsg(`${B.nome} construído!`);
      }
      i++;
    }
  }

  renderInfo(ctx) {
    const g = this.game;
    const b = this.buildingAt(this.sel.x, this.sel.y);
    if (!b) { this.mode = null; return; }
    const B = BUILDINGS[b.tipo];
    const bw = 380, bh = 300, bx = W / 2 - bw / 2, by = 100;
    panel(ctx, bx, by, bw, bh);
    text(ctx, `${B.nome}  ·  Nível ${b.nivel}`, bx + bw / 2, by + 14, { align: 'center', size: 16, bold: true, color: PAL.gold });
    if (this.closeBtn(ctx, bx + bw - 40, by + 10)) { this.mode = null; }
    drawSprite(ctx, B.spr, bx + 50, by + 70, 4);
    text(ctx, B.desc, bx + 95, by + 52, { size: 11, color: PAL.textDim });
    if (B.prod) {
      const time = B.time / (1 + 0.15 * (b.nivel - 1));
      bar(ctx, bx + 95, by + 74, 240, 10, (b.progress || 0) / time, PAL.good);
      text(ctx, `Relógio da Colheita: ${Math.max(0, time - (b.progress || 0)).toFixed(0)}s`, bx + 95, by + 88, { size: 10, color: PAL.textDim });
      const acc = Object.entries(b.acumulado || {}).filter(([, v]) => v >= 1);
      text(ctx, acc.length ? 'Pronto: ' + acc.map(([k, v]) => `${Math.floor(v)} ${RES_NAMES[k].toLowerCase()}`).join(', ') : 'Produzindo...',
        bx + 95, by + 104, { size: 11, color: acc.length ? PAL.good : PAL.textDim });
    }
    if (B.bonus === 'dmg') text(ctx, `Bônus atual: +${(6 * b.nivel)}% dano permanente`, bx + 30, by + 120, { size: 12, color: PAL.good });
    if (B.bonus === 'hp') text(ctx, `Bônus atual: +${8 * b.nivel} PV permanente`, bx + 30, by + 120, { size: 12, color: PAL.good });

    let yy = by + 150;
    const upCost = upgradeCost(B.cost, b.nivel);
    const upStr = Object.entries(upCost).map(([k, v]) => `${v} ${RES_NAMES[k].toLowerCase()}`).join(' + ');
    if (button(g, ctx, 'up', `Melhorar — ${upStr}`, bx + 30, yy, bw - 60, 34, { size: 12, disabled: !this.canPay(upCost) })) {
      this.pay(upCost); b.nivel++; SAVE.save(); sfx.build(); this.setMsg(`${B.nome} melhorado!`);
    }
    yy += 44;
    if (b.tipo === 'mercado') {
      if (button(g, ctx, 'openmkt', 'Abrir Mercado', bx + 30, yy, bw - 60, 34, { size: 12 })) this.mode = 'mercado';
      yy += 44;
    }
    if (b.tipo === 'abrigo') {
      if (button(g, ctx, 'openabr', 'Abrigar herói', bx + 30, yy, bw - 60, 34, { size: 12 })) this.mode = 'abrigo';
      yy += 44;
    }
    const refund = Math.floor((B.cost.ouro || 0) * 0.5 * b.nivel);
    if (button(g, ctx, 'demolish', `Desmontar  (+${refund} ouro)`, bx + 30, yy, bw - 60, 30, { size: 11 })) {
      this.s.recursos.ouro += refund;
      this.s.edificios.splice(this.s.edificios.indexOf(b), 1);
      SAVE.save(); sfx.build(); this.mode = null; this.setMsg('Edifício desmontado.');
    }
  }

  renderMercado(ctx) {
    const g = this.game;
    const bw = 380, bh = 280, bx = W / 2 - bw / 2, by = 110;
    panel(ctx, bx, by, bw, bh);
    text(ctx, 'Mercado', bx + bw / 2, by + 14, { align: 'center', size: 16, bold: true, color: PAL.gold });
    if (this.closeBtn(ctx, bx + bw - 40, by + 10)) { this.mode = 'info'; }
    const deals = [['trigo', 4], ['madeira', 6], ['pedra', 8]];
    deals.forEach(([k, gold], i) => {
      const y = by + 60 + i * 60;
      drawSprite(ctx, RES_ICONS[k], bx + 44, y + 14, 3);
      text(ctx, `1 ${RES_NAMES[k].toLowerCase()} → ${gold} ouro`, bx + 66, y + 6, { size: 13 });
      const can = (this.s.recursos[k] || 0) >= 1;
      if (button(g, ctx, 'sell1' + k, 'Vender 1', bx + 210, y, 70, 28, { size: 11, disabled: !can })) {
        this.s.recursos[k]--; this.s.recursos.ouro += gold; SAVE.save(); sfx.coin();
      }
      const all = Math.floor(this.s.recursos[k] || 0);
      if (button(g, ctx, 'sellA' + k, 'Tudo', bx + 288, y, 60, 28, { size: 11, disabled: all < 1 })) {
        this.s.recursos[k] -= all; this.s.recursos.ouro += all * gold; SAVE.save(); sfx.coin();
      }
    });
  }

  renderAbrigo(ctx) {
    const g = this.game;
    const bw = 420, bh = 280, bx = W / 2 - bw / 2, by = 110;
    panel(ctx, bx, by, bw, bh);
    text(ctx, 'Abrigo — Novo Herói', bx + bw / 2, by + 14, { align: 'center', size: 16, bold: true, color: PAL.gold });
    if (this.closeBtn(ctx, bx + bw - 40, by + 10)) { this.mode = 'info'; }
    const hero = this.nextLockedHero();
    if (!hero) {
      text(ctx, 'Todos os heróis já foram abrigados!', bx + bw / 2, by + 120, { align: 'center', size: 13, color: PAL.good });
      return;
    }
    drawSprite(ctx, hero.spr, bx + 60, by + 90, 5);
    text(ctx, hero.nome, bx + 110, by + 60, { size: 15, bold: true, color: PAL.gold });
    // passiva com quebra de linha
    ctx.font = '11px "Courier New", monospace';
    const words = hero.passiva.split(' ');
    let line = '', ly = by + 82;
    for (const w2 of words) {
      if (ctx.measureText(line + w2).width > 270) { text(ctx, line, bx + 110, ly, { size: 11, color: PAL.textDim }); line = w2 + ' '; ly += 14; }
      else line += w2 + ' ';
    }
    text(ctx, line, bx + 110, ly, { size: 11, color: PAL.textDim });
    const costStr = Object.entries(hero.unlock).map(([k, v]) => `${v} ${RES_NAMES[k].toLowerCase()}`).join(' + ');
    text(ctx, 'Custo: ' + costStr, bx + 110, by + 140, { size: 12, color: PAL.gold });
    if (button(g, ctx, 'unlockhero', 'Desbloquear herói', bx + 60, by + 200, bw - 120, 38,
      { disabled: !this.canPay(hero.unlock) })) {
      this.pay(hero.unlock);
      this.s.herois[hero.id] = { exp: 0, nivel: 1 };
      SAVE.save(); sfx.levelup();
      this.setMsg(`${hero.nome} juntou-se à base!`);
      this.mode = null;
    }
  }
}
