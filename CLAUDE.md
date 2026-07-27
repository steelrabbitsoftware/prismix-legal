# Travel Heros — contexto do projeto

Leia este arquivo antes de mexer em qualquer coisa: ele resume o estado atual,
as decisões já tomadas e o que vem a seguir.

## O que é

Jogo mobile-first inspirado nas premissas de **BALL x PIT** (Devolver, 2025):
roguelite de esferas que ricocheteiam + construção de vila entre as partidas.
Estúdio: **PRISMIX**. Idioma do jogo e do código: **português (BR)**.

- Código do jogo: `game/` — HTML5 Canvas, ES Modules, **zero dependências**
- Documento de design: `game/GDD.md`
- Pipeline e prompts de arte: `game/MESHY.md`
- App Android (WebView): `android/` — ver `android/README-ANDROID.md`
- Protótipo de direção de arte: `game/proto/proto25d.html`
- Branch de trabalho: `claude/bau-x-pit-game-tp9uut`

## Como rodar

```bash
python3 -m http.server 8000     # na raiz do repo
# abra http://localhost:8000/game/
```

Depois de alterar qualquer arquivo em `game/js/`, regenere o bundle do app:

```bash
npx esbuild game/js/main.js --bundle --format=iife --minify --outfile=game/dist/bundle.js
```

## Arquitetura

| Arquivo | Responsabilidade |
|---|---|
| `js/engine.js` | Loop, cenas, input (mouse + **multitouch**), UI imediata, paleta |
| `js/data.js` | Esferas, fusões, inimigos, heróis, edifícios, biomas |
| `js/combat.js` | A run: grade de inimigos, zona de perigo, level-up, chefes |
| `js/base.js` | Vila: construir, colher, expandir, desbloquear heróis |
| `js/sprites.js` | **Todos os visuais** — trocar placeholders por assets reais é só aqui |
| `js/save.js` | localStorage (`travel_heros_save_v1`), config, bônus permanentes |
| `js/options.js` | Opções de controle (menu + pausa) |
| `js/audio.js` | SFX WebAudio + vibração háptica |

## Decisões já tomadas (não refazer sem motivo)

- **Controles**: tela dividida (um lado move por arrasto relativo, o outro
  posiciona a mira), invertível para canhotos; modo alternativo de um dedo com
  mira automática. Configurável no menu e na pausa.
- **Inimigos em grade**: fileiras organizadas de 6 colunas que descem alinhadas.
  A plataforma sob o monstro aparece no nascimento e desvanece.
- **Zona de perigo**: perto da borda inferior o monstro para, telegrafa ~1,5s
  (anel vermelho + "!") e dá golpe pesado (2,2× o dano). **Não desenhar linha
  na tela** — o aviso é o próprio monstro.
- **Alguns inimigos atiram de longe**: aranha (flecha), caveira e fantasma (magia).
- **Fases/biomas** a cada 5 ondas: Floresta, Deserto, Montanhas.
- **Arte**: seguir para **2.5D** (sprites com perspectiva), com o Meshy gerando
  modelos 3D que viram sprites renderizados em ângulo fixo de 35°.

## Testes

Não existe suíte automatizada no repo; a validação é feita com Playwright +
Chromium headless, dirigindo o jogo de verdade (menu → seleção → combate →
resultados → base) e conferindo que o console fica sem erros. Ao alterar o
jogo, rode algo equivalente antes de concluir.

## Pendências

- [ ] Nome definitivo (candidatos livres: Prismfall, Ricochet Realms, Deep
      Wardens, Bouncebound). **Evitar** "Orb/Orbs Raiders" — existe
      "Orb Raider – Ball Game" na Play Store, mesmo gênero.
- [ ] Gerar os assets no Meshy (28 modelos) — ver ordem em `game/MESHY.md`
- [ ] Converter a renderização para 2.5D quando os assets chegarem
- [ ] Compilar o APK (`android/`, `gradlew assembleDebug`) — exige SDK Android
- [ ] Trilha sonora

## Limitações do ambiente de nuvem (não valem na máquina local)

A sessão web roda atrás de um proxy que **bloqueia** `dl.google.com`,
`maven.google.com` e `meshy.ai`. Por isso o APK não pôde ser compilado nem os
assets gerados por lá. **Rodando localmente, os dois destravam.**
