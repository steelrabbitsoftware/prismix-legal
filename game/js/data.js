// Dados de conteúdo: esferas, fusões, inimigos, heróis, edifícios

export const BALLS = {
  prisma_b: { nome: 'Prisma', cor: '#e8e8ff', dmg: 9, vel: 300, desc: 'Esfera equilibrada.' },
  fogo:     { nome: 'Fogo', cor: '#ff7a3c', dmg: 7, vel: 300, cond: 'burn', desc: 'Aplica Queimadura (dano/s).' },
  gelo:     { nome: 'Gelo', cor: '#6fd0ff', dmg: 7, vel: 290, cond: 'slow', desc: 'Aplica Lentidão.' },
  sangue:   { nome: 'Sangue', cor: '#e8425a', dmg: 8, vel: 300, cond: 'bleed', desc: 'Sangramento acumulável.' },
  veneno:   { nome: 'Veneno', cor: '#7cd046', dmg: 6, vel: 300, cond: 'poison', desc: 'Veneno (% da vida).' },
  raio:     { nome: 'Raio', cor: '#ffe04a', dmg: 7, vel: 330, chain: 1, desc: 'Corrente elétrica no vizinho.' },
  ferro:    { nome: 'Ferro', cor: '#9aa2b0', dmg: 16, vel: 220, knock: 26, desc: 'Pesada: dano alto e empurrão.' },
  vento:    { nome: 'Vento', cor: '#7ce8d0', dmg: 6, vel: 400, crit: 0.10, desc: 'Muito rápida, +10% crítico.' },
  // fusões
  magma:    { nome: 'Magma', cor: '#ff5a2c', dmg: 20, vel: 250, cond: 'burn', pool: true, fusion: true, desc: 'Deixa poças incendiárias.' },
  nevasca:  { nome: 'Nevasca', cor: '#bfefff', dmg: 12, vel: 300, aoe: 'slow', fusion: true, desc: 'Congela em área ao ricochetear.' },
  peconha:  { nome: 'Peçonha Rubra', cor: '#c03a8c', dmg: 12, vel: 310, cond: 'bleed', cond2: 'poison', spread: true, fusion: true, desc: 'Condições se espalham ao matar.' },
  tempestade:{ nome: 'Tempestade', cor: '#fff0a0', dmg: 11, vel: 430, chain: 2, crit: 0.10, fusion: true, desc: 'Correntes duplas, velocidade máxima.' },
  cristal:  { nome: 'Cristal', cor: '#c8d8ff', dmg: 14, vel: 280, shatter: 3, fusion: true, desc: 'Estilhaça em 3 fragmentos.' },
  solnegro: { nome: 'Sol Negro', cor: '#b0483c', dmg: 14, vel: 300, cond: 'burn', lifesteal: 0.25, fusion: true, desc: 'Queimadura que cura o herói.' },
};

export const FUSIONS = [
  { a: 'fogo', b: 'ferro', out: 'magma' },
  { a: 'gelo', b: 'vento', out: 'nevasca' },
  { a: 'sangue', b: 'veneno', out: 'peconha' },
  { a: 'raio', b: 'vento', out: 'tempestade' },
  { a: 'gelo', b: 'ferro', out: 'cristal' },
  { a: 'fogo', b: 'sangue', out: 'solnegro' },
];

export const ENEMIES = {
  slime:    { nome: 'Gosma', spr: 'slime', hp: 18, spd: 26, dmg: 8, xp: 1, gold: 1, scale: 3 },
  morcego:  { nome: 'Morcego', spr: 'morcego', hp: 10, spd: 46, dmg: 6, xp: 1, gold: 1, zig: true, scale: 3 },
  caveira:  { nome: 'Caveira', spr: 'caveira', hp: 42, spd: 18, dmg: 12, xp: 2, gold: 2, scale: 3 },
  aranha:   { nome: 'Aranha', spr: 'aranha', hp: 24, spd: 34, dmg: 8, xp: 2, gold: 2, zig: true, scale: 3 },
  fantasma: { nome: 'Fantasma', spr: 'fantasma', hp: 30, spd: 30, dmg: 10, xp: 2, gold: 2, phase: true, scale: 3 },
  boss:     { nome: 'Olho do Abismo', spr: 'boss', hp: 550, spd: 9, dmg: 30, xp: 25, gold: 30, boss: true, scale: 6 },
};

// composição de ondas: pesos por profundidade
export function waveSpec(n) {
  const pool = [['slime', 10], ['morcego', Math.min(8, n)], ['caveira', Math.max(0, n - 2)],
                ['aranha', Math.max(0, n - 3)], ['fantasma', Math.max(0, n - 5)]];
  const count = 3 + Math.floor(n * 2.2);
  const hpMul = Math.pow(1.22, n - 1);
  const boss = n % 5 === 0;
  return { pool: pool.filter(p => p[1] > 0), count, hpMul, boss };
}

export const CHARS = [
  {
    id: 'guerreiro', nome: 'O Guerreiro', spr: 'guerreiro', ball: 'prisma_b',
    stats: { res: 6, for: 7, lid: 4, vel: 3, des: 4, int: 3 },
    passiva: 'Um guerreiro vagante. O personagem padrão, sem atributos especiais.',
    unlock: null,
  },
  {
    id: 'piromante', nome: 'O Piromante', spr: 'piromante', ball: 'fogo',
    stats: { res: 4, for: 2, lid: 5, vel: 3, des: 5, int: 2 },
    passiva: 'Mira dispersa, mas dispara 2× mais rápido.',
    fireMul: 2, spread: 0.35,
    unlock: { trigo: 4, madeira: 2 },
  },
  {
    id: 'cacadora', nome: 'A Caçadora', spr: 'cacadora', ball: 'vento',
    stats: { res: 4, for: 5, lid: 3, vel: 6, des: 8, int: 3 },
    passiva: '+15% crítico; esferas atravessam 1 inimigo.',
    critBonus: 0.15, pierce: 1,
    unlock: { trigo: 6, madeira: 6 },
  },
  {
    id: 'ferreiro', nome: 'O Ferreiro', spr: 'ferreiro', ball: 'ferro',
    stats: { res: 8, for: 9, lid: 2, vel: 2, des: 3, int: 2 },
    passiva: 'Dispara devagar, mas com dano maciço e empurrão.',
    fireMul: 0.6, dmgMul: 1.5,
    unlock: { madeira: 8, pedra: 6 },
  },
  {
    id: 'necromante', nome: 'A Necromante', spr: 'necromante', ball: 'sangue',
    stats: { res: 5, for: 4, lid: 6, vel: 4, des: 4, int: 9 },
    passiva: 'Condições duram 50% mais; cura 1 PV ao matar inimigo sangrando.',
    condMul: 1.5, healOnBleedKill: 1,
    unlock: { trigo: 10, pedra: 10 },
  },
  {
    id: 'prisma', nome: 'O Prisma', spr: 'prisma', ball: 'prisma_b',
    stats: { res: 6, for: 6, lid: 6, vel: 6, des: 6, int: 6 },
    passiva: 'Começa com uma esfera extra aleatória; 4 cartas no level-up.',
    extraBall: true, cards4: true,
    unlock: { trigo: 16, madeira: 16, pedra: 16 },
  },
];

export const BUILDINGS = {
  campo:    { nome: 'Campo de Trigo', spr: 'campo', cost: { ouro: 30 }, prod: { trigo: 1 }, time: 40, desc: 'Produz trigo com o tempo.' },
  serraria: { nome: 'Serraria', spr: 'serraria', cost: { ouro: 50 }, prod: { madeira: 1 }, time: 55, desc: 'Produz madeira.' },
  pedreira: { nome: 'Pedreira', spr: 'pedreira', cost: { ouro: 80 }, prod: { pedra: 1 }, time: 70, desc: 'Produz pedra.' },
  abrigo:   { nome: 'Abrigo', spr: 'abrigo', cost: { ouro: 60, madeira: 2 }, desc: 'Desbloqueia um novo herói.' },
  forja:    { nome: 'Forja', spr: 'forja', cost: { ouro: 100, madeira: 3, pedra: 2 }, bonus: 'dmg', desc: '+6% de dano por nível (permanente).' },
  totem:    { nome: 'Totem', spr: 'totem', cost: { ouro: 90, trigo: 3, pedra: 2 }, bonus: 'hp', desc: '+8 PV por nível (permanente).' },
  mercado:  { nome: 'Mercado', spr: 'mercado', cost: { ouro: 70, madeira: 2 }, desc: 'Vende recursos por ouro.' },
};

// fases/biomas: muda a cada 5 ondas (faixas laterais temáticas + cores da arena)
export const BIOMES = [
  { nome: 'Floresta', strip: '#16301f', stripDark: '#0e2015', arena: ['#14231b', '#22392b'], deco: 'arvore' },
  { nome: 'Deserto', strip: '#3a2e1a', stripDark: '#281f10', arena: ['#241d10', '#3a3018'], deco: 'cacto' },
  { nome: 'Montanhas', strip: '#232c44', stripDark: '#161c2e', arena: ['#161c2c', '#2a3450', ], deco: 'pico' },
];

export const RES_ICONS = { ouro: 'moeda', trigo: 'trigo', madeira: 'madeira', pedra: 'pedra' };
export const RES_NAMES = { ouro: 'Ouro', trigo: 'Trigo', madeira: 'Madeira', pedra: 'Pedra' };

export function upgradeCost(base, level) {
  const out = {};
  for (const [k, v] of Object.entries(base)) out[k] = Math.ceil(v * Math.pow(1.6, level));
  return out;
}

// derivações de atributos (como na referência)
export function derive(ch, meta) {
  const s = ch.stats;
  return {
    hp: 40 + s.res * 10 + (meta?.hpBonus || 0),
    dmgMul: (1 + s.for * 0.06) * (ch.dmgMul || 1) * (1 + (meta?.dmgBonus || 0)),
    babyCount: 2 + Math.floor(s.lid / 3),          // esferas-bebê iniciais
    ballVel: 1 + s.vel * 0.05,
    moveSpd: 170 + s.vel * 12,
    crit: s.des * 0.008 + (ch.critBonus || 0),
    fireRate: (1 + s.des * 0.04) * (ch.fireMul || 1), // disparos/s base 1
    condMul: (1 + s.int * 0.08) * (ch.condMul || 1),
  };
}
