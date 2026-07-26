// Opções de controle — compartilhadas entre o Menu e a Pausa
import { PAL, panel, text, button } from './engine.js';
import { sfx } from './audio.js';
import * as SAVE from './save.js';

// Desenha o bloco de controles e aplica as mudanças no save.
// Altura ocupada: 186px.
export function drawControlOptions(game, ctx, x, y, w, cfg) {
  text(ctx, 'Controles', x + w / 2, y, { align: 'center', size: 14, bold: true, color: PAL.border });

  // modo
  const meio = w / 2 - 4;
  const split = cfg.modo === 'split';
  if (button(game, ctx, 'opt_split', 'Tela dividida', x, y + 22, meio, 34,
      { size: 11, fill: split ? '#6b3f8f' : '#3a2450', color: split ? PAL.gold : PAL.textDim })) {
    cfg.modo = 'split'; SAVE.save(); sfx.click();
  }
  if (button(game, ctx, 'opt_auto', 'Um dedo (auto)', x + meio + 8, y + 22, meio, 34,
      { size: 11, fill: !split ? '#6b3f8f' : '#3a2450', color: !split ? PAL.gold : PAL.textDim })) {
    cfg.modo = 'auto'; SAVE.save(); sfx.click();
  }

  // esquema de lados (só faz sentido no modo dividido)
  const lado = cfg.canhoto ? 'Mira ← · Move →' : 'Move ← · Mira →';
  if (button(game, ctx, 'opt_side', lado, x, y + 64, w, 32,
      { size: 11, disabled: !split })) {
    cfg.canhoto = !cfg.canhoto; SAVE.save(); sfx.click();
  }

  // pré-visualização dos lados
  const pvY = y + 102, pvH = 44;
  panel(ctx, x, pvY, w, pvH, { fill: '#241633' });
  if (split) {
    const moveEsq = !cfg.canhoto;
    ctx.fillStyle = '#7ce8d022'; ctx.fillRect(x + 3, pvY + 3, w / 2 - 4, pvH - 6);
    ctx.fillStyle = '#f5c56a22'; ctx.fillRect(x + w / 2 + 1, pvY + 3, w / 2 - 4, pvH - 6);
    text(ctx, moveEsq ? 'MOVER' : 'MIRAR', x + w / 4, pvY + pvH / 2 - 6,
      { align: 'center', size: 12, bold: true, color: moveEsq ? '#7ce8d0' : PAL.gold });
    text(ctx, moveEsq ? 'MIRAR' : 'MOVER', x + w * 0.75, pvY + pvH / 2 - 6,
      { align: 'center', size: 12, bold: true, color: moveEsq ? PAL.gold : '#7ce8d0' });
    ctx.strokeStyle = PAL.borderDark; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(x + w / 2, pvY + 4); ctx.lineTo(x + w / 2, pvY + pvH - 4); ctx.stroke();
    ctx.setLineDash([]);
  } else {
    text(ctx, 'Arraste em qualquer lugar · mira automática', x + w / 2, pvY + pvH / 2 - 6,
      { align: 'center', size: 10, color: PAL.textDim });
  }

  // vibração
  if (button(game, ctx, 'opt_hap', `Vibração: ${cfg.haptico ? 'LIGADA' : 'desligada'}`, x, y + 152, w, 30,
      { size: 11, color: cfg.haptico ? PAL.good : PAL.textDim })) {
    cfg.haptico = !cfg.haptico; SAVE.save(); sfx.click();
  }
}
