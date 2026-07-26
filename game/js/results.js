// Fim de Jogo: tabela de desempenho por esfera (como na referência, com DPS)
import { W, H, PAL, panel, text, button, bar, fmt } from './engine.js';
import { drawSprite, ballSprite } from './sprites.js';
import { BALLS } from './data.js';
import { sfx } from './audio.js';
import * as SAVE from './save.js';

export class Results {
  enter(p) {
    this.p = p;
    // aplica recompensas UMA vez
    const s = SAVE.load();
    s.recursos.ouro += p.gold;
    s.runs++;
    s.recordes.onda = Math.max(s.recordes.onda, p.wave);
    s.recordes.abates = Math.max(s.recordes.abates, p.kills);
    s.recordes.dano = Math.max(s.recordes.dano, Math.round(p.totalDmg));
    SAVE.save();
    SAVE.addHeroExp(p.char.id, p.kills);
    this.hl = SAVE.heroLevel(p.char.id);
  }

  update() {}

  render(ctx) {
    const g = this.game, p = this.p;
    ctx.fillStyle = PAL.bg2; ctx.fillRect(0, 0, W, H);
    text(ctx, p.win ? 'Abismo Selado — Fim de Jogo' : 'Fim de Jogo', W / 2, 24, { align: 'center', size: 24, bold: true, color: p.win ? PAL.gold : PAL.border });

    // painel esquerdo: resumo
    panel(ctx, 40, 70, 380, 380);
    text(ctx, 'Recursos Encontrados', 230, 92, { align: 'center', size: 15, bold: true });
    drawSprite(ctx, 'moeda', 200, 124, 3);
    text(ctx, fmt(p.gold), 220, 116, { size: 18, bold: true, color: PAL.gold });
    text(ctx, 'Abates', 230, 156, { align: 'center', size: 15, bold: true });
    text(ctx, String(p.kills), 230, 178, { align: 'center', size: 18, color: PAL.text });
    text(ctx, 'EXP Obtida', 230, 210, { align: 'center', size: 15, bold: true });
    text(ctx, String(p.kills), 230, 232, { align: 'center', size: 18, color: PAL.xp });
    text(ctx, `Onda alcançada: ${p.wave}`, 230, 264, { align: 'center', size: 13, color: PAL.textDim });

    panel(ctx, 60, 300, 340, 120, { fill: PAL.panelDark });
    drawSprite(ctx, p.char.spr, 110, 360, 5);
    text(ctx, p.char.nome, 160, 320, { size: 16, bold: true, color: PAL.gold });
    text(ctx, `Nível ${this.hl.nivel}`, 160, 344, { size: 12 });
    bar(ctx, 160, 364, 210, 12, this.hl.exp / this.hl.next, PAL.xp);
    text(ctx, `${this.hl.exp} / ${this.hl.next}`, 265, 366, { align: 'center', size: 10, color: '#fff' });

    // painel direito: tabela por esfera
    panel(ctx, 460, 70, 460, 380);
    text(ctx, 'Lançamentos', 660, 90, { align: 'center', size: 12, bold: true, color: PAL.textDim });
    text(ctx, 'Dano', 780, 90, { align: 'center', size: 12, bold: true, color: PAL.textDim });
    text(ctx, 'DPS', 870, 90, { align: 'center', size: 12, bold: true, color: PAL.textDim });
    let y = 116;
    const entries = Object.entries(p.stats).sort((a, b) => b[1].dano - a[1].dano);
    for (const [type, st] of entries) {
      const B = BALLS[type];
      if (!B) continue;
      const img = ballSprite(B.cor, 9);
      ctx.drawImage(img, 484, y - 4);
      text(ctx, B.nome, 508, y, { size: 12, color: B.cor });
      text(ctx, fmt(st.lanc), 660, y, { align: 'center', size: 12 });
      text(ctx, fmt(st.dano), 780, y, { align: 'center', size: 12 });
      text(ctx, (st.dano / Math.max(1, p.time)).toFixed(2), 870, y, { align: 'center', size: 12 });
      y += 26;
      if (y > 420) break;
    }
    text(ctx, `Tempo de run: ${Math.floor(p.time / 60)}:${String(Math.floor(p.time % 60)).padStart(2, '0')}`,
      690, 430, { align: 'center', size: 12, color: PAL.textDim });

    if (button(g, ctx, 'tobase', 'Voltar à Base', W / 2 - 130, H - 64, 260, 42, { color: PAL.gold })) {
      sfx.click(); g.switch('base');
    }
  }
}
