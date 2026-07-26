// Artes iniciais básicas: pixel-art procedural (placeholder até os assets do Meshy AI).
// Cada entrada tem `map` (linhas de chars) + `pal` (char → cor). Trocar por PNGs depois
// é só substituir a fábrica mantendo os mesmos nomes.
// meshyPrompt: sugestão de prompt para gerar o asset final no Meshy AI.

const DEFS = {
  // ---------------- heróis (retratos 12x12) ----------------
  guerreiro: {
    meshyPrompt: 'chibi pixel art knight portrait, steel helm with red plume, purple background, 16x16',
    pal: { k: '#20143a', s: '#e8b48c', a: '#8fa8c8', d: '#5a6f94', r: '#e8563f', o: '#f5c56a' },
    map: [
      '....rrrr....',
      '...rrrrrr...',
      '..aaaaaaaa..',
      '.aadddddaaa.',
      '.adaaaaaada.',
      '.adakkakada.',
      '.adaaaaaada.',
      '.aaddddddaa.',
      '..assssssa..',
      '..aassssaa..',
      '.aaaaaaaaaa.',
      '.aaaa..aaaa.',
    ],
  },
  piromante: {
    meshyPrompt: 'chibi pixel art fire wizard portrait, big pink hat with feather, white beard, 16x16',
    pal: { k: '#20143a', s: '#e8b48c', h: '#d8407a', hh: '#f06fa0', b: '#f0e6e0', o: '#f5a03c', f: '#ffd97a' },
    map: [
      '.....ff.....',
      '..hhhhhhhh..',
      '.hhhhhhhhhh.',
      'hhhhhhhhhhhh',
      '..ssssssss..',
      '..skssssks..',
      '..ssssssss..',
      '..bbssssbb..',
      '.bbbbbbbbbb.',
      '.bbbbbbbbbb.',
      '..bbbbbbbb..',
      '...bbbbbb...',
    ],
  },
  cacadora: {
    meshyPrompt: 'chibi pixel art huntress portrait, green hood, sharp eyes, 16x16',
    pal: { k: '#20143a', s: '#dba379', g: '#3f9e5f', d: '#2c7245', o: '#f5c56a' },
    map: [
      '....gggg....',
      '..gggggggg..',
      '.gggggggggg.',
      '.ggddddddgg.',
      '.gdssssssdg.',
      '.gdskssksdg.',
      '.gdssssssdg.',
      '.ggdssssdgg.',
      '..ggddddgg..',
      '..gggggggg..',
      '.ggg....ggg.',
      '.gg......gg.',
    ],
  },
  ferreiro: {
    meshyPrompt: 'chibi pixel art blacksmith portrait, thick beard, iron headband, 16x16',
    pal: { k: '#20143a', s: '#d9a074', b: '#6b4a33', i: '#8a8f9c', o: '#f5c56a' },
    map: [
      '....iiii....',
      '..iiiiiiii..',
      '..ssssssss..',
      '.sskssssks..',
      '.ssssssssss.',
      '.sbbbbbbbbs.',
      '.bbbbbbbbbb.',
      'bbbbbbbbbbbb',
      'bbbbbbbbbbbb',
      '.bbbbbbbbbb.',
      '..bbbbbbbb..',
      '...bbbbbb...',
    ],
  },
  necromante: {
    meshyPrompt: 'chibi pixel art necromancer portrait, dark violet hood, glowing red eyes, 16x16',
    pal: { k: '#0d0618', v: '#5b2d84', d: '#3d1d5c', r: '#ff4a4a', p: '#c9b6dd' },
    map: [
      '....vvvv....',
      '..vvvvvvvv..',
      '.vvvvvvvvvv.',
      '.vvddddddvv.',
      '.vdkkkkkkdv.',
      '.vdkrkkrkdv.',
      '.vdkkkkkkdv.',
      '.vvdkkkkdvv.',
      '..vvddddvv..',
      '..vvvvvvvv..',
      '.vvv....vvv.',
      '.vv......vv.',
    ],
  },
  prisma: {
    meshyPrompt: 'chibi pixel art crystal being portrait, prismatic rainbow facets, 16x16',
    pal: { k: '#20143a', a: '#ff7ad9', b: '#7ad9ff', c: '#fff07a', d: '#a07aff', w: '#ffffff' },
    map: [
      '.....ww.....',
      '....waaw....',
      '...waabbw...',
      '..waabbccw..',
      '.waabbccddw.',
      'waabbccddaaw',
      'wbbccddaabbw',
      '.wccddaabbw.',
      '..wddaabbw..',
      '...wdaabw...',
      '....wabw....',
      '.....ww.....',
    ],
  },
  // ---------------- inimigos ----------------
  slime: {
    meshyPrompt: 'pixel art purple slime monster, cute menacing, 16x16',
    pal: { p: '#9c4fd0', d: '#6f2fa0', k: '#20143a', w: '#f3e6ff' },
    map: [
      '............',
      '............',
      '....pppp....',
      '..pppppppp..',
      '.pppppppppp.',
      '.ppwkppwkpp.',
      'pppppppppppp',
      'pppdppppdppp',
      'ppdddddddppp',
      '.pdddddddpp.',
      '..dddddddd..',
      '............',
    ],
  },
  morcego: {
    meshyPrompt: 'pixel art bat monster wings spread, dark purple, 16x16',
    pal: { p: '#7a4fd0', d: '#4f2f90', k: '#20143a', r: '#ff5a5a' },
    map: [
      '............',
      'p..........p',
      'pp........pp',
      'ppp..pp..ppp',
      'pppppppppppp',
      'ppdppppppdpp',
      '.pprppprppp.',
      '..pppppppp..',
      '...pdppdp...',
      '....p..p....',
      '............',
      '............',
    ],
  },
  caveira: {
    meshyPrompt: 'pixel art floating skull enemy, bone white with purple glow, 16x16',
    pal: { w: '#e8e0d8', d: '#b0a698', k: '#20143a', g: '#c96fff' },
    map: [
      '....gggg....',
      '..gwwwwwwg..',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.wkkwwwwkkw.',
      '.wkkwwwwkkw.',
      '.wwwwkkwwww.',
      '..wwwwwwww..',
      '..wdwdwdwd..',
      '..wdwdwdwd..',
      '...dddddd...',
      '............',
    ],
  },
  aranha: {
    meshyPrompt: 'pixel art spider enemy, dark body red marking, 16x16',
    pal: { b: '#3a2650', d: '#241535', r: '#ff4a6a', k: '#12081f' },
    map: [
      '............',
      'b..b....b..b',
      '.b.b.bb.b.b.',
      '..bbbbbbbb..',
      '.bbbbbbbbbb.',
      'b.bbrbbrbb.b',
      '.bbbbbbbbbb.',
      '..bbbrrbbb..',
      '.b.bbbbbb.b.',
      'b..b....b..b',
      '............',
      '............',
    ],
  },
  fantasma: {
    meshyPrompt: 'pixel art ghost enemy, translucent teal, 16x16',
    pal: { t: '#6fd0c0', d: '#3f9088', k: '#12081f', w: '#eafffa' },
    map: [
      '....tttt....',
      '..tttttttt..',
      '.tttttttttt.',
      '.twkttttwkt.',
      '.tttttttttt.',
      '.ttttddtttt.',
      '.tttttttttt.',
      '.tttttttttt.',
      '.tttttttttt.',
      '.tt.ttt.ttt.',
      '.t...t...t..',
      '............',
    ],
  },
  boss: {
    meshyPrompt: 'pixel art giant demon eye boss, purple flesh, golden horns, 24x24',
    pal: { f: '#8a3fb0', d: '#5c2478', o: '#f5c56a', r: '#ff3a5a', w: '#ffffff', k: '#12081f' },
    map: [
      '.oo......oo.',
      'ooffffffffoo',
      '.ffffffffff.',
      'ffffwwwwffff',
      'fffwwwwwwfff',
      'ffwwwrrwwwff',
      'ffwwrrrrwwff',
      'fffwwrrwwfff',
      'ffffwwwwffff',
      '.ffdddddfff.',
      '..ffdddfff..',
      '...ffffff...',
    ],
  },
  // ---------------- edifícios (14x12) ----------------
  campo: {
    meshyPrompt: 'pixel art wheat field tile, golden crops rows, top-down, 32x32',
    pal: { g: '#f5c56a', d: '#b8863f', s: '#7a5c2e', e: '#3f6b3a' },
    map: [
      'eeeeeeeeeeeeee',
      'egdgdgdgdgdgde',
      'egggggggggggge',
      'edgdgdgdgdgdge',
      'egggggggggggge',
      'egdgdgdgdgdgde',
      'egggggggggggge',
      'edgdgdgdgdgdge',
      'egggggggggggge',
      'egdgdgdgdgdgde',
      'esssssssssssse',
      'eeeeeeeeeeeeee',
    ],
  },
  serraria: {
    meshyPrompt: 'pixel art lumber camp with trees and logs, top-down, 32x32',
    pal: { g: '#4fae5c', d: '#2f7a3c', t: '#6b4a33', e: '#2c5a30' },
    map: [
      'eeeeeeeeeeeeee',
      'e..ggg...ggg.e',
      'e.ggggg.gggg.e',
      'e.ggggg.gggg.e',
      'e..gdg...gdg.e',
      'e...t.....t..e',
      'e.ttttttttt..e',
      'e.ttttttttt..e',
      'e..ggg..ggg..e',
      'e.ggggg.gggg.e',
      'e...t.....t..e',
      'eeeeeeeeeeeeee',
    ],
  },
  pedreira: {
    meshyPrompt: 'pixel art stone quarry with blue rocks, top-down, 32x32',
    pal: { r: '#8f9fc8', d: '#5f6f94', e: '#6b5a45', k: '#3a3040' },
    map: [
      'eeeeeeeeeeeeee',
      'e..rrr...rr..e',
      'e.rrrrr.rrrr.e',
      'e.rdrrr.rdrr.e',
      'e..rrr...rr..e',
      'e....kkkk....e',
      'e..rrkkkkrr..e',
      'e.rrrrkkrrrr.e',
      'e.rdrrr.rdrr.e',
      'e..rrr...rr..e',
      'e............e',
      'eeeeeeeeeeeeee',
    ],
  },
  abrigo: {
    meshyPrompt: 'pixel art medieval cottage with purple roof, top-down slight angle, 32x32',
    pal: { r: '#b05fd0', d: '#7a3f94', w: '#d9c4a0', t: '#8a6f4a', e: '#4a3a2c', o: '#f5c56a' },
    map: [
      '.....rr.......',
      '...rrrrrr.....',
      '..rrrrrrrr....',
      '.rrrrrrrrrr...',
      'rrddrrrrddrr..',
      '.wwwwwwwwww...',
      '.wwtwwwwtww...',
      '.wwtwoowtww...',
      '.wwtwoowtww...',
      '.wwwwwwwwww...',
      '.wwwwwwwwww...',
      '..............',
    ],
  },
  forja: {
    meshyPrompt: 'pixel art blacksmith forge building with anvil and fire glow, 32x32',
    pal: { s: '#6f6f80', d: '#4a4a5c', f: '#ff8a3c', k: '#2a2030', t: '#8a6f4a' },
    map: [
      '..............',
      '..ssssssssss..',
      '.sssssssssss..',
      '.ssddddddsss..',
      '.ssdffffdsss..',
      '.ssdffffdsss..',
      '.ssddddddsss..',
      '.ssssssssss...',
      '.sstkkkkstss..',
      '.sstkkkkstss..',
      '..ssssssssss..',
      '..............',
    ],
  },
  totem: {
    meshyPrompt: 'pixel art magic totem monument with glowing pink runes, 32x32',
    pal: { s: '#7a6f94', d: '#54496b', p: '#f06fa0', e: '#3a3050' },
    map: [
      '.....pp.......',
      '....pppp......',
      '.....ss.......',
      '....ssss......',
      '....sdds......',
      '....spps......',
      '....sdds......',
      '....ssss......',
      '....spps......',
      '...ssssss.....',
      '..ssssssss....',
      '..............',
    ],
  },
  mercado: {
    meshyPrompt: 'pixel art market stall with striped awning, gold coins, 32x32',
    pal: { a: '#e8563f', w: '#f0e6d0', t: '#8a6f4a', o: '#f5c56a', e: '#4a3a2c' },
    map: [
      '..............',
      '.awawawawawa..',
      '.wawawawawaw..',
      '.awawawawawa..',
      '..tttttttt....',
      '..t......t....',
      '..t.oo.o.t....',
      '..t.o.oo.t....',
      '..tttttttt....',
      '..t......t....',
      '..t......t....',
      '..............',
    ],
  },
  // ---------------- misc ----------------
  gema: {
    meshyPrompt: 'pixel art xp gem, magenta crystal, 8x8',
    pal: { p: '#e042c8', l: '#ff8ae8', d: '#8f2480' },
    map: ['..pp..', '.plpp.', 'plpppp', 'pppppd', '.ppdd.', '..dd..'],
  },
  moeda: {
    meshyPrompt: 'pixel art gold coin, 8x8',
    pal: { o: '#f5c56a', d: '#b8863f', l: '#ffe8a0' },
    map: ['..oo..', '.oloo.', 'oloodo', 'oooodo', '.oodd.', '..dd..'],
  },
  trigo: { pal: { g: '#f5c56a', d: '#b8863f' }, map: ['..g.g.', '.gdgd.', '.gdgd.', '..dd..', '..dd..', '..dd..'] },
  madeira: { pal: { t: '#8a6f4a', d: '#5c4a30' }, map: ['......', 'tttttt', 'tdddtt', 'tttttt', 'ttdddt', 'tttttt'] },
  pedra: { pal: { r: '#8f9fc8', d: '#5f6f94' }, map: ['..rr..', '.rrrr.', 'rrrdrr', 'rrrrdr', '.rrrr.', '......'] },
  cadeado: {
    pal: { o: '#c8a86a', d: '#8a6f3a', k: '#3a2c1a' },
    map: ['..oo..', '.o..o.', '.o..o.', 'oooooo', 'ookkoo', 'oooooo'],
  },
};

const cache = new Map();

export function sprite(name, scale = 3) {
  const key = name + '@' + scale;
  if (cache.has(key)) return cache.get(key);
  const def = DEFS[name];
  if (!def) throw new Error('sprite? ' + name);
  const rows = def.map, h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      const col = def.pal[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  cache.set(key, c);
  return c;
}

export function drawSprite(ctx, name, x, y, scale = 3, centered = true) {
  const s = sprite(name, scale);
  ctx.drawImage(s, Math.round(x - (centered ? s.width / 2 : 0)), Math.round(y - (centered ? s.height / 2 : 0)));
}

// esfera desenhada proceduralmente (cor + brilho + símbolo)
const ballCache = new Map();
export function ballSprite(color, r = 7) {
  const key = color + r;
  if (ballCache.has(key)) return ballCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = r * 2 + 2;
  const g = c.getContext('2d');
  const cx = r + 1, cy = r + 1;
  const grad = g.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.2, cx, cy, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, shade(color, -0.45));
  g.fillStyle = grad;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#00000055'; g.stroke();
  ballCache.set(key, c);
  return c;
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function meshyManifest() {
  const out = {};
  for (const [k, v] of Object.entries(DEFS)) if (v.meshyPrompt) out[k] = v.meshyPrompt;
  return out;
}
