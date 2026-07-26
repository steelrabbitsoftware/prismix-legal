# TRAVEL HEROS — Game Design Document (o "prompt" do projeto)

> **Gênero:** Roguelite de ricochete (breakout-survivors) + construção de base
> **Inspiração:** BALL x PIT (Devolver Digital, 2025) — mesmas premissas, execução melhor
> **Plataforma:** Web (HTML5 Canvas, ES Modules, zero dependências) → depois desktop/mobile
> **Idioma:** Português (BR)
> **Estúdio:** PRISMIX

---

## 1. Visão

Em **TRAVEL HEROS**, o jogador comanda heróis viajantes que desceram ao **Abismo** para selá-lo. O combate é um
*breakout invertido*: o herói se move na borda inferior da arena e dispara **esferas**
que ricocheteiam pelas paredes e trituram hordas de monstros que descem do topo.
Entre as descidas (runs), os sobreviventes constroem uma **cidade na borda do Abismo**
— campos, serrarias, abrigos — que gera recursos, desbloqueia novos heróis e concede
melhorias permanentes.

**Por que "muito melhor" que a referência:**

| Referência (BALL x PIT)            | TRAVEL HEROS                                                |
|------------------------------------|-------------------------------------------------------------|
| Fusões fixas de 2 esferas          | Fusões **elementais reativas** (as condições interagem: molhado+raio = superchoque, queimadura+vento = incêndio alastrante) |
| Colheita manual com trabalhador    | Colheita com **relógio de colheita + coleta em um toque**, sem micro chato |
| Personagens = pacotes de stats     | Personagens com **passiva que muda a regra do jogo** (não só números) |
| Level-up com 3 cartas              | 3 cartas + **rerolar grátis 1×/nível** + banimento de carta |
| Fim de run seco                    | Tabela de DPS por esfera + **recordes e profundidade máxima** |

## 2. Pilares de design

1. **Caos legível** — dezenas de esferas na tela, mas cor/forma/rastro comunicam tudo.
2. **Toda run ensina a base; toda base turbina a run** — os dois loops se alimentam.
3. **Fusão é o momento "uau"** — o jogador planeja a build em torno delas.
4. **Sessões de 8–15 min** — morrer nunca é punição: sempre volta com recursos.

## 3. Loop de jogo

```
MENU → SELEÇÃO DE HERÓI → RUN DE COMBATE (ondas + chefe a cada 5)
   ↘ morte/vitória → RESULTADOS (DPS por esfera, EXP, recursos)
      → BASE (construir/colher/expandir/desbloquear) → nova RUN
```

## 4. Combate (a Run)

- Arena vertical com **faixas laterais temáticas**: cada fase (5 ondas) tem um bioma
  de natureza — Floresta, Deserto, Montanhas — que muda as cores e decorações.
  A estrada rola sob os pés: o grupo avança pelo caminho enquanto os monstros vêm.
- O herói **anda livremente por toda a arena**; encostar em inimigo causa dano
  (com breve invulnerabilidade).

### 4.0 Controles (mobile-first)

| Modo | Como funciona |
|------|----------------|
| **Tela dividida** (padrão) | Um lado da tela move (arrasto relativo), o outro posiciona a mira. Lados invertíveis para canhotos. |
| **Um dedo (auto)** | Arraste em qualquer lugar para mover; a mira trava sozinha no inimigo mais próximo. |

Editável no **Menu → Controles** e na **Pausa**, no meio da partida. Teclado
(WASD/setas + mouse) segue valendo no desktop. Vibração háptica opcional.

O **tiro é automático**, mas a dificuldade exige perícia: a mira manual decide
quais alvos morrem primeiro, e sobreviver depende de posicionamento.

- Esferas ricocheteiam nas bordas jogáveis e nos inimigos; esfera que sai pelo
  fundo re-arma no herói.
- Inimigos surgem **em grade**: fileiras organizadas lado a lado (colunas fixas,
  tipos aleatórios) que descem juntas, alinhadas, como uma formação.

### 4.0.1 Zona de perigo e ameaças

- **Zona de perigo**: quando um monstro chega perto da borda inferior, ele
  **para, telegrafa por ~1,5s** (anel vermelho fechando + "!") e desfere um
  **golpe pesado** (2,2× o dano de contato). Não há linha desenhada na tela —
  o aviso é o próprio monstro; o brilho vermelho só acende durante a carga.
- **Ataques à distância**: alguns inimigos atiram — Aranha (flecha rápida),
  Caveira e Fantasma (magia). Os projéteis são desviáveis, o que torna o
  movimento tão importante quanto a mira.
- Gemas de EXP caem dos mortos; ao subir de nível: **3 cartas** (nova esfera, melhoria
  de esfera, passiva) + 1 reroll grátis; **fusão** aparece quando duas esferas ≥ nv.3.
- **Chefe a cada 5 ondas** com barra própria e padrões de investida.
- Morte ou selo do chefe da onda 15 → tela de resultados (mantém tudo que coletou).

### 4.1 Esferas (básicas)

| Esfera     | Cor      | Efeito                                     |
|------------|----------|--------------------------------------------|
| Prisma     | branca   | equilibrada                                |
| Fogo       | laranja  | aplica **Queimadura** (dano/s)             |
| Gelo       | ciano    | aplica **Lentidão**                        |
| Sangue     | vermelha | **Sangramento** acumulável                 |
| Veneno     | verde    | **Veneno** (% da vida)                     |
| Raio       | amarela  | **Corrente** — arco no inimigo mais próximo|
| Ferro      | cinza    | dano alto, lenta, **empurrão**             |
| Vento      | verde-água| muito rápida, +crítico                    |

### 4.2 Fusões (nível 3 + nível 3 → nova esfera)

| Fusão                | Receita       | Efeito                                            |
|----------------------|---------------|---------------------------------------------------|
| **Magma**            | Fogo + Ferro  | bola pesada que deixa poças incendiárias          |
| **Nevasca**          | Gelo + Vento  | congela em área ao ricochetear                    |
| **Peçonha Rubra**    | Sangue + Veneno| condição híbrida que se espalha ao matar         |
| **Tempestade**       | Raio + Vento  | correntes duplas e velocidade máxima              |
| **Cristal**          | Gelo + Ferro  | estilhaça em 3 fragmentos ao acertar              |
| **Sol Negro**        | Fogo + Sangue | queimadura que cura o herói por dano causado      |

## 5. Heróis (atributos como na referência: RES/FOR/LID/VEL/DES/INT)

| Herói            | Esfera inicial | Passiva de regra                                        |
|------------------|----------------|---------------------------------------------------------|
| **O Guerreiro**  | Prisma         | padrão, sem modificadores (tutorial)                    |
| **O Piromante**  | Fogo           | dispara 2× mais rápido, mira dispersa                   |
| **A Caçadora**   | Vento          | +crítico; esferas atravessam 1 inimigo                  |
| **O Ferreiro**   | Ferro          | −taxa de disparo, +dano maciço e empurrão               |
| **A Necromante** | Sangue         | condições duram 50% mais; cura ao matar sangrando       |
| **O Prisma**     | 2 esferas      | começa com Prisma+aleatória; +1 carta no level-up       |

Derivações: PV = 40+10·RES · dano = ×(1+0,06·FOR) · esferas-bebê por LID ·
velocidade da esfera por VEL · crítico por DES · poder de condição por INT.

## 6. Base (metagame)

- Grade de terreno com **expansão** comprável; cursor estilo painel medieval.
- **Edifícios:** Campo de Trigo (trigo), Serraria (madeira), Pedreira (pedra),
  Abrigo (desbloqueia herói), Forja (+dano permanente), Totem (+PV permanente),
  Mercado (vende recursos por ouro).
- **Relógio de Colheita:** produção em tempo real (e offline ao voltar); coleta em um toque.
- Edifícios têm nível (Melhorar), podem ser **Reorganizados** e **Desmontados** (reembolso).

## 7. Economia

- **Ouro** cai na run e vem do Mercado; **trigo/madeira/pedra** vêm da base.
- Custos crescem geometricamente (×1,6 por nível); recompensa de run cresce com profundidade.

## 8. Arte & Áudio

- **Fase 1 (agora):** pixel-art procedural gerada em runtime (paleta roxo/rosa/dourado
  medieval, 12×12 e 16×16) + SFX sintetizados via WebAudio.
- **Fase 2 (Meshy AI):** o manifesto de sprites (`js/sprites.js`) centraliza todos os
  visuais; cada sprite terá seu prompt Meshy (ex.: *"chibi pixel knight, purple palette,
  16x16, top-down"*) e será substituído por PNG/spritesheet sem tocar na lógica.

## 9. Persistência

`localStorage` (chave `travel_heros_save_v1`): recursos, edifícios, heróis
desbloqueados, EXP/nível por herói, recordes, melhorias permanentes.

## 10. Roadmap

- [x] MVP jogável completo (este commit)
- [ ] Artes finais via Meshy AI + spritesheets
- [ ] Música procedural/trilha
- [ ] Mais 6 fusões, 3 chefes únicos, eventos de onda (névoa, chuva de meteoros)
- [ ] Gamepad + mobile polish + PWA offline
- [ ] Placar online

## 11. Como rodar

Abra `game/index.html` num servidor estático (`python3 -m http.server`) ou acesse
via GitHub Pages. Controles: ←→/A-D mover · mouse mira · clique/espaço pausa a mira ·
Esc pausa · M muta.
