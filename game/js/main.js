// Boot do PRISMA × ABISMO
import { Game } from './engine.js';
import { Menu } from './menu.js';
import { CharSelect } from './charselect.js';
import { Combat } from './combat.js';
import { Base } from './base.js';
import { Results } from './results.js';
import { toggleMute } from './audio.js';
import * as SAVE from './save.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

game.add('menu', new Menu());
game.add('charselect', new CharSelect());
game.add('combat', new Combat());
game.add('base', new Base());
game.add('results', new Results());

// mute global
window.addEventListener('keydown', (e) => { if (e.code === 'KeyM') toggleMute(); });
// salva ao sair
window.addEventListener('beforeunload', () => SAVE.save());

SAVE.load();
game.switch('menu');

// expõe para depuração/testes automatizados
window.__game = game;
