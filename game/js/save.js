// Persistência em localStorage
const KEY = 'travel_heros_save_v1';

const DEFAULT = {
  recursos: { ouro: 60, trigo: 0, madeira: 0, pedra: 0 },
  edificios: [],           // {tipo, x, y, nivel, acumulado, t0}
  plots: 12,               // células desbloqueadas (crescem com expansão)
  herois: { guerreiro: { exp: 0, nivel: 1 } }, // desbloqueados
  recordes: { onda: 0, abates: 0, dano: 0 },
  runs: 0,
  lastSeen: 0,
};

let state = null;

export function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...structuredClone(DEFAULT), ...JSON.parse(raw) } : structuredClone(DEFAULT);
  } catch (e) { state = structuredClone(DEFAULT); }
  return state;
}

export function save() {
  try { state.lastSeen = Date.now(); localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sem storage */ }
}

export function reset() { state = structuredClone(DEFAULT); save(); }

// bônus permanentes derivados dos edifícios
export function metaBonus() {
  const s = load();
  let dmgBonus = 0, hpBonus = 0;
  for (const b of s.edificios) {
    if (b.tipo === 'forja') dmgBonus += 0.06 * b.nivel;
    if (b.tipo === 'totem') hpBonus += 8 * b.nivel;
  }
  return { dmgBonus, hpBonus };
}

export function heroLevel(id) {
  const h = load().herois[id];
  if (!h) return { nivel: 1, exp: 0, next: 400 };
  return { nivel: h.nivel, exp: h.exp, next: h.nivel * 400 };
}

export function addHeroExp(id, exp) {
  const s = load();
  if (!s.herois[id]) return;
  const h = s.herois[id];
  h.exp += exp;
  while (h.exp >= h.nivel * 400) { h.exp -= h.nivel * 400; h.nivel++; }
  save();
}
