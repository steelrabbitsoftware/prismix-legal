// Menu principal
import { W, H, PAL, panel, text, button, rnd, fmt } from './engine.js';
import { ballSprite } from './sprites.js';
import { sfx, toggleMute } from './audio.js';
import * as SAVE from './save.js';

const COLORS = ['#ff7a3c', '#6fd0ff', '#e8425a', '#7cd046', '#ffe04a', '#9aa2b0', '#7ce8d0', '#e8e8ff'];

export class Menu {
  enter() {
    this.s = SAVE.load();
    this.confirmReset = false;
    this.balls = Array.from({ length: 14 }, () => ({
      x: rnd(W), y: rnd(H), vx: rnd(-120, 120), vy: rnd(-120, 120),
      r: rnd(5, 11), c: COLORS[Math.floor(rnd(COLORS.length))],
    }));
  }

  update(dt) {
    for (const b of this.balls) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < b.r || b.x > W - b.r) b.vx *= -1;
      if (b.y < b.r || b.y > H - b.r) b.vy *= -1;
    }
    if (this.game.justKey('KeyM')) toggleMute();
  }

  render(ctx) {
    const g = this.game;
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#14091f'); grd.addColorStop(1, '#311b4d');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.5;
    for (const b of this.balls) {
      const img = ballSprite(b.c, b.r);
      ctx.drawImage(img, b.x - img.width / 2, b.y - img.height / 2);
    }
    ctx.globalAlpha = 1;

    text(ctx, 'TRAVEL', W / 2 - 75, 110, { align: 'center', size: 52, bold: true, color: '#ff8ae8' });
    text(ctx, '×', W / 2 + 32, 118, { align: 'center', size: 40, bold: true, color: PAL.gold });
    text(ctx, 'HEROS', W / 2 + 132, 110, { align: 'center', size: 52, bold: true, color: '#8ab6ff' });
    text(ctx, 'um roguelite de ricochete + construção de base — por PRISMIX', W / 2, 178, { align: 'center', size: 13, color: PAL.textDim });

    if (button(g, ctx, 'play', '⚔  JOGAR', W / 2 - 140, 240, 280, 48, { size: 18, color: PAL.gold })) {
      sfx.click(); g.switch('charselect');
    }
    if (button(g, ctx, 'base', '⌂  A BASE', W / 2 - 140, 300, 280, 44)) { sfx.click(); g.switch('base'); }

    // recordes
    panel(ctx, W / 2 - 170, 366, 340, 92);
    text(ctx, 'Recordes', W / 2, 376, { align: 'center', size: 14, bold: true, color: PAL.border });
    const r = this.s.recordes;
    text(ctx, `Onda máx: ${r.onda}   Abates: ${fmt(r.abates)}   Dano: ${fmt(r.dano)}`, W / 2, 400, { align: 'center', size: 12 });
    text(ctx, `Runs: ${this.s.runs}`, W / 2, 420, { align: 'center', size: 12, color: PAL.textDim });

    if (!this.confirmReset) {
      if (button(g, ctx, 'reset', 'Apagar save', W - 150, H - 46, 130, 32, { size: 11 })) this.confirmReset = true;
    } else {
      text(ctx, 'Tem certeza?', W - 240, H - 70, { size: 12, color: PAL.bad });
      if (button(g, ctx, 'resetyes', 'SIM, apagar', W - 260, H - 46, 120, 32, { size: 11, color: PAL.bad })) {
        SAVE.reset(); this.s = SAVE.load(); this.confirmReset = false; sfx.hurt();
      }
      if (button(g, ctx, 'resetno', 'Não', W - 130, H - 46, 110, 32, { size: 11 })) this.confirmReset = false;
    }
    text(ctx, 'M = som liga/desliga', 16, H - 30, { size: 11, color: PAL.textDim });
  }
}
