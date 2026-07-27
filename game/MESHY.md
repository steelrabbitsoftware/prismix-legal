# Travel Heros — Pipeline e Prompts do Meshy AI

Como usamos o Meshy: ele gera os **modelos 3D**, e nós renderizamos **sprites 2D
em ângulo fixo** para o jogo (estilo 2.5D). Isso resolve o problema que geradores
de imagem 2D não resolvem: **iluminação coerente entre todos os assets** e
**várias poses/ângulos do mesmo personagem**.

---

## 1. Configuração padrão (use igual em TODOS os assets)

Manter esses parâmetros constantes é o que garante que os assets pareçam do
mesmo jogo:

| Parâmetro | Valor |
|---|---|
| Modo | **Text to 3D** (ou Image to 3D quando houver referência) |
| Art style | **Stylized** (não realista) |
| Polycount | **Low / Adaptive** (mesmo virando sprite, agiliza o preview) |
| Textura | **PBR desligado** — queremos cor chapada estilizada |
| Câmera do render | **elevação 35°, sem rotação** (o ângulo do nosso jogo) |
| Luz | principal a 45° pela frente-esquerda; luz de preenchimento fria e fraca |
| Fundo | **transparente** (PNG com alpha) |
| Resolução do sprite | 256×256 para monstros/heróis · 512×512 para edifícios e chefes |

### Sufixo de estilo (cole no fim de todo prompt)

```
stylized fantasy game asset, chunky readable silhouette, hand-painted texture,
saturated colors, soft rim light, no realistic PBR, transparent background,
three-quarter top-down view, 35 degree camera elevation
```

---

## 2. Prompts — Heróis

Gere cada herói em 3 poses: **parado**, **andando**, **atingido**.

| Asset | Prompt |
|---|---|
| `guerreiro` | `chibi knight in dented steel armor, red plume on helm, round shield on back, heroic stance` |
| `piromante` | `chibi fire wizard, oversized magenta wide-brim hat with feather, white beard, glowing ember in hand` |
| `cacadora` | `chibi huntress, green hooded cloak, short bow, quiver of arrows, agile crouched pose` |
| `ferreiro` | `chibi blacksmith, thick braided beard, iron headband, heavy hammer, broad shoulders` |
| `necromante` | `chibi necromancer, deep violet hood hiding face, two glowing red eyes, skull-topped staff` |
| `prisma` | `chibi crystal being, translucent prismatic body with rainbow facets, floating shards orbiting` |

## 3. Prompts — Monstros

Gere **parado** e **atacando** (o frame de ataque é usado na telegrafia do golpe).

| Asset | Prompt |
|---|---|
| `slime` | `purple gelatinous slime monster, glossy wet surface, two glowing eyes, wobbling blob shape` |
| `morcego` | `small demon bat, wide leathery wings spread, violet fur, red glowing eyes, fangs` |
| `caveira` | `floating skull mage, bone white, purple flame in eye sockets, cracked jaw, arcane glow` |
| `aranha` | `dark cave spider, eight legs, red hourglass marking on abdomen, sharp fangs` |
| `fantasma` | `translucent teal ghost, wispy tattered lower body, hollow glowing eyes, ethereal` |
| `boss` | `giant demon eye boss, purple veined flesh, golden curved horns, single massive bloodshot eye` |

## 4. Prompts — Edifícios da vila

Renderizar em **3 níveis** (o jogo já mostra evolução por nível):

| Asset | Prompt base | Nível 3 acrescenta | Nível 5 acrescenta |
|---|---|---|---|
| `campo` | `wheat field plot with golden crops in rows, wooden fence border` | espantalho | moinho pequeno |
| `serraria` | `lumber camp, stacked logs, tree stumps, two-man saw` | telhado de madeira | serra movida a água |
| `pedreira` | `stone quarry pit, blue-grey boulders, pickaxes, ore cart` | trilhos | guindaste |
| `abrigo` | `cozy medieval cottage, purple tiled roof, warm window light` | segundo andar | bandeirolas |
| `forja` | `blacksmith forge, stone chimney, anvil, orange fire glow` | fole | martelo mecânico |
| `totem` | `magic stone totem, carved runes glowing pink, moss at base` | anéis flutuantes | aura dourada |
| `mercado` | `market stall, red and white striped awning, crates, gold coins` | segunda barraca | placa dourada |

## 5. Prompts — Cenário (biomas)

Peças de parede lateral e props de chão, por fase:

| Bioma | Prompt |
|---|---|
| Floresta | `dense pine forest wall segment, mossy rocks, ferns, dappled green light` |
| Deserto | `desert canyon wall segment, layered orange sandstone, cacti, sun-bleached bones` |
| Montanhas | `snowy mountain wall segment, grey granite, ice patches, pine snags` |

Props soltos: `mossy boulder`, `broken cart`, `campfire with cooking pot`,
`stack of barrels`, `ruined stone pillar`.

---

## 6. Do Meshy até o jogo

1. **Gerar** o modelo com o prompt + sufixo de estilo.
2. **Refinar** (o Meshy tem passo de refino de textura) e baixar em **GLB**.
3. **Renderizar o sprite**: abrir o GLB, travar a câmera nos 35° de elevação,
   fundo transparente, exportar PNG. Dá para fazer no Blender (script de câmera
   fixa) ou direto no visualizador do Meshy com fundo transparente.
4. **Montar o atlas**: juntar os PNGs num spritesheet por categoria
   (`herois.png`, `monstros.png`, `edificios.png`).
5. **Plugar no jogo**: `game/js/sprites.js` centraliza TODOS os visuais.
   Basta trocar a fábrica procedural pelo carregamento do atlas — a assinatura
   `drawSprite(ctx, nome, x, y, escala)` continua igual, então **nenhuma outra
   parte do código muda**.

### Checklist de qualidade antes de aprovar um asset

- [ ] Silhueta legível a 32px de altura (teste: diminua e veja se reconhece)
- [ ] Mesma direção de luz dos demais (principal pela frente-esquerda)
- [ ] Contraste suficiente contra o chão do bioma
- [ ] Fundo transparente sem franjas brancas nas bordas
- [ ] Paleta compatível: roxo/rosa/dourado nos heróis e UI; os monstros
      contrastam com o bioma da fase

---

## 7. Ordem de produção sugerida

1. **1 monstro + 1 herói** → validar o estilo antes de escalar (evita refazer 40 assets)
2. Os 5 monstros restantes
3. Os 6 heróis
4. Chefe
5. Edifícios (nível 1 de cada)
6. Cenário dos 3 biomas
7. Variações de nível 3 e 5 dos edifícios
