// Seleção de personagem (estilo painel da referência)
import { W, H, PAL, panel, text, button, bar } from './engine.js';
import { drawSprite } from './sprites.js';
import { CHARS, derive } from './data.js';
import { sfx } from './audio.js';
import * as SAVE from './save.js';

const STAT_NAMES = { res: 'Resistência', for: 'Força', lid: 'Liderança', vel: 'Velocidade', des: 'Destreza', int: 'Inteligência' };
const STAT_COLS = { res: '#e84a6f', for: '#ff8a3c', lid: '#f5c56a', vel: '#7ce8d0', des: '#8ae87c', int: '#8ab6ff' };

export class CharSelect {
  enter() {
    this.s = SAVE.load();
    this.idx = 0;
    // seleciona o primeiro desbloqueado
    const first = CHARS.findIndex(c => this.s.herois[c.id]);
    if (first >= 0) this.idx = first;
  }

  update() {}

  render(ctx) {
    const g = this.game;
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
    text(ctx, 'Selecionar Personagem', 24, 18, { size: 20, bold: true, color: PAL.border });

    // grade de retratos
    const cols = 4, size = 86, gap = 12;
    const gx = 24, gy = 64;
    CHARS.forEach((c, i) => {
      const x = gx + (i % cols) * (size + gap), y = gy + Math.floor(i / cols) * (size + gap);
      const unlocked = !!this.s.herois[c.id];
      const selected = i === this.idx;
      panel(ctx, x, y, size, size, { border: selected ? PAL.gold : PAL.border, fill: unlocked ? PAL.panel : '#2c2035' });
      if (unlocked) drawSprite(ctx, c.spr, x + size / 2, y + size / 2, 5);
      else drawSprite(ctx, 'cadeado', x + size / 2, y + size / 2, 7);
      if (g.pointer.justDown && g.pointer.x >= x && g.pointer.x <= x + size && g.pointer.y >= y && g.pointer.y <= y + size) {
        this.idx = i; sfx.click();
      }
    });

    // painel de detalhes
    const c = CHARS[this.idx];
    const unlocked = !!this.s.herois[c.id];
    const px = 440, pw = W - px - 24;
    panel(ctx, px, 56, pw, 430);
    const hl = SAVE.heroLevel(c.id);
    text(ctx, c.nome, px + pw / 2, 74, { align: 'center', size: 22, bold: true, color: PAL.gold });
    text(ctx, unlocked ? `Nível ${hl.nivel}` : 'Bloqueado', px + pw / 2, 100, { align: 'center', size: 13, color: PAL.textDim });
    bar(ctx, px + 120, 120, pw - 240, 10, unlocked ? hl.exp / hl.next : 0, PAL.xp);
    text(ctx, unlocked ? `${hl.exp} / ${hl.next}` : '— / —', px + pw / 2, 134, { align: 'center', size: 11, color: PAL.textDim });

    panel(ctx, px + 30, 156, 120, 120, { fill: PAL.panelDark });
    if (unlocked) drawSprite(ctx, c.spr, px + 90, 216, 8);
    else drawSprite(ctx, 'cadeado', px + 90, 216, 10);

    // passiva
    ctx.font = '12px "Courier New", monospace';
    const words = c.passiva.split(' ');
    let line = '', ly = 166;
    for (const w2 of words) {
      if (ctx.measureText(line + w2).width > pw - 220) { text(ctx, line, px + 170, ly, { size: 12 }); line = w2 + ' '; ly += 16; }
      else line += w2 + ' ';
    }
    text(ctx, line, px + 170, ly, { size: 12 });

    // atributos
    let sy = 290;
    const d = derive(c, SAVE.metaBonus());
    Object.entries(c.stats).forEach(([k, v]) => {
      text(ctx, STAT_NAMES[k], px + 30, sy, { size: 12, color: STAT_COLS[k] });
      bar(ctx, px + 150, sy + 1, 130, 10, v / 10, STAT_COLS[k]);
      text(ctx, String(v), px + 292, sy, { size: 12 });
      sy += 20;
    });
    // derivados
    text(ctx, `PV ${d.hp} · Dano ×${d.dmgMul.toFixed(2)} · Crít ${(d.crit * 100).toFixed(0)}%`, px + 30, sy + 6, { size: 11, color: PAL.textDim });
    text(ctx, `Disparo ${d.fireRate.toFixed(1)}/s · Esferas-bebê ${d.babyCount}`, px + 30, sy + 22, { size: 11, color: PAL.textDim });

    if (unlocked) {
      if (button(g, ctx, 'go', '⚔ Selecionar', px + pw / 2 - 110, 442, 220, 38, { color: PAL.gold })) {
        sfx.click();
        g.switch('combat', { char: c });
      }
    } else {
      text(ctx, 'Construa um Abrigo na base para desbloquear.', px + pw / 2, 440, { align: 'center', size: 12, color: PAL.bad });
    }

    if (button(g, ctx, 'back', '← Base', 24, H - 60, 130, 38)) { sfx.click(); g.switch('base'); }
    if (button(g, ctx, 'menu', 'Menu', 170, H - 60, 110, 38)) { sfx.click(); g.switch('menu'); }
  }
}
