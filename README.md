# Valdren: Ecos da Fenda

RPG de ação 3D em terceira pessoa, com estética medieval, que roda no navegador. Tudo é gerado por código: o terreno, a vila, o castelo, os personagens e suas animações, os efeitos, a música e os sons. Não há modelos, texturas nem áudios externos; os únicos arquivos de terceiros são as fontes.

> *Por mil anos, o Coração de Aether sustentou o Véu, a fronteira entre o mundo desperto e o Sonhar. Há um ano, na Noite do Eclipse, ele se partiu. O céu se rasgou ao norte do castelo, pesadelos ganharam garras e rabiscos de tinta ganharam vida. Naquela noite, um fragmento do Coração caiu sobre a vila de Brumavale... e encontrou você.*

## Como jogar

**Sem instalar nada:** abra o arquivo [`docs/index.html`](docs/index.html) no navegador (duplo clique). Ele contém o jogo inteiro num único arquivo e funciona sem servidor e sem internet. Para jogar online, ative o GitHub Pages do repositório apontando para a pasta `/docs` (Settings → Pages).

**Para desenvolver**, com [Node.js](https://nodejs.org) 20.19 ou mais recente (ou 22.12+):

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Outros comandos:

| Comando | Resultado |
| --- | --- |
| `npm run build` | Build de produção em `dist/`, para servir em qualquer servidor web estático. |
| `npm run build:single` | Regera `docs/index.html`, o arquivo único com tudo embutido. |
| `npm run preview` | Serve o conteúdo de `dist/` localmente. |
| `npm test` | Regera `docs/index.html` e roda um teste de fumaça num Chromium headless: começa um jogo, luta, usa poderes, abre os menus e salva, falhando se houver qualquer erro de JavaScript. Na primeira vez, instale o navegador com `npx playwright install chromium` (ou aponte `CHROME_PATH` para um Chromium já instalado). |

Recomendado: navegador baseado em Chromium ou Firefox atualizado, com mouse e teclado. Em *Configurações* dá para baixar a qualidade gráfica (sombras, bloom e resolução) se o desempenho estiver baixo.

## Controles

| Tecla | Ação |
| --- | --- |
| `W` `A` `S` `D` | Mover |
| Mouse / setas | Câmera (clique na tela para capturar o mouse) |
| Roda do mouse | Zoom da câmera |
| `Shift` | Correr |
| `Espaço` | Pular |
| `Q` | Esquivar com rolamento (invulnerável durante o giro) |
| Botão esquerdo | Ataque com espada (combo de 3 golpes) |
| Botão direito | Bloquear; no momento exato do golpe inimigo, **aparar** |
| `1` – `4` | Poderes equipados |
| `F` | Travar a mira num alvo |
| `E` | Interagir / conversar |
| `R` / `T` | Poção de vida / poção de mana |
| `C` `I` `K` `J` `M` `L` | Personagem, inventário, poderes, diário, mapa, crônicas |
| `Esc` | Pausa (salvar, carregar, configurações) |

Nos diálogos: `Espaço`/`E` avança o texto, `1`–`9` escolhem uma resposta.

## O que o jogo tem

### História própria e missões
- Uma história original dividida em três atos, com prólogo narrado e diálogos que se adaptam ao gênero escolhido para o protagonista.
- **8 missões principais**, que levam da vila de Brumavale ao lago, às montanhas, a um templo esquecido, ao castelo e, por fim, à Fenda.
- **9 missões secundárias**, entre elas *O Filho do Ferreiro*, *Ovelhas Desgarradas*, *Flores-da-Lua*, *O Fantasma do Moinho*, *Caçada à Presa-Branca*, *As Cores de Tico*, *O Sussurro da Pedra Negra*, *O Desafio do Eremita* e *Memórias de Lyra*. Várias delas mudam o que acontece no final.
- Diário com missões ativas e concluídas, marcador na bússola e no minimapa, mapa do reino e um códex (*Crônicas*) que vai sendo preenchido conforme você descobre a história.

### Boss fights
Chefes com barra própria, fases, golpes telegrafados (círculos e linhas de aviso no chão), ataques em área, invocações e momentos de vulnerabilidade. Alguns podem ser poupados em vez de destruídos. O confronto final muda conforme suas escolhas: quem luta ao seu lado, quem sobrevive e até a força do inimigo dependem do que você fez antes.

### Poderes naturais e sobrenaturais
Oito escolas, com dois poderes cada. Elas são despertadas ao longo da história principal e das missões secundárias.

| Natureza | Escola | Poderes |
| --- | --- | --- |
| Natural | 🔥 Fogo | Bola de Fogo, Erupção |
| Natural | 💧 Água | Lança d'Água, Maré Curativa |
| Natural | ☀️ Luz | Lança Solar, Clarão Sagrado |
| Natural | 🪨 Terra | Espinhos de Pedra, Pele de Pedra |
| Natural | 🌪️ Vento | Lâmina de Vento, Tempestade |
| Sobrenatural | 🔮 Psíquico | Telecinese, Domínio Mental |
| Sobrenatural | 🎨 Toon | Bigorna!, Marreta Gigante (física de desenho animado, com direito a inimigos achatados) |
| Sobrenatural | 🌑 Sombra | Passo Sombrio, Drenar Vida |

Os elementos se combinam: água deixa o alvo **molhado**, e um raio nele **eletrocuta**; vento sobre um alvo em chamas espalha uma **tempestade de fogo**; água apaga o fogo com uma explosão de **vapor**; terra sobre um alvo molhado vira **lama**; dano psíquico num inimigo atordoado causa **mente partida**. Cada inimigo tem resistências e fraquezas próprias (mortos-vivos temem a luz, rabiscos de tinta não gostam de água...).

### Sistema de atributos
Ao subir de nível você ganha pontos de atributo e pontos de essência, usados para desbloquear poderes e aprimorá-los até o nível 3.

| Atributo | Efeito |
| --- | --- |
| **Força** | Dano com armas, eficiência do bloqueio, opções de intimidação |
| **Destreza** | Velocidade de ataque, chance de crítico, custo menor da esquiva |
| **Vitalidade** | Vida e vigor máximos, resistência a efeitos |
| **Inteligência** | Dano dos poderes naturais, mana máxima, pistas extras nos diálogos |
| **Espírito** | Dano dos poderes sobrenaturais, regeneração de mana, caminhos místicos nos diálogos |
| **Carisma** | Preços menores nas lojas, opções persuasivas nos diálogos |

Você começa escolhendo uma de quatro **origens** (Aprendiz de Ferreiro, Caçador das Brumas, Erudito do Mosteiro, Andarilho Contador de Histórias), cada uma com bônus de atributos e ouro inicial, e personaliza a aparência do personagem (corpo, pele, cabelo, barba, cores da capa e da túnica).

Também há inventário com armas, armaduras e amuletos que alteram os atributos, poções, materiais e itens de missão, lojas com preço influenciado pelo Carisma, pedras-guia para viagem rápida e descanso na taverna.

### Escolhas e finais alternativos
- Diálogos ramificados com **testes de atributo** (Força, Inteligência, Espírito, Carisma), respostas que mudam a reputação moral do personagem e decisões que definem o destino de vários personagens: quem vive, quem vira aliado, quem é perdoado.
- O que você descobre (e conta, ou esconde) muda as conversas e as opções disponíveis no clímax.
- **Seis finais diferentes**, cada um com epílogo próprio que mostra as consequências das suas escolhas para os personagens e para o reino.

### Estética medieval
Vila com casas de enxaimel, ferraria, moinho e taverna; castelo com muralhas, torres e portões; templo em ruínas; acampamento de bandidos; cemitério; floresta, lago e montanhas. Ciclo de dia e noite com tochas e janelas acesas, névoa, água animada, vegetação balançando ao vento, interface com pergaminho e fontes góticas, e trilha sonora medieval gerada em tempo real (alaúde, flauta, tambores) que muda conforme o lugar e a situação.

## Salvamento

O jogo salva automaticamente em pontos importantes (missões, pedras-guia, descanso) e pelo menu de pausa, usando o armazenamento local do navegador (`localStorage`). Limpar os dados do site apaga o progresso.

## Estrutura do código

```
src/
  core/      motor (renderização, laço, entrada, câmera, áudio, salvamento, orquestração do jogo)
  world/     terreno, céu, água, vegetação, construções, colisão
  entities/  esqueletos procedurais, animação, modelos, jogador, inimigos, NPCs, chefes
  combat/    dano, efeitos de status, projéteis, poderes e partículas
  rpg/       atributos, inventário, missões, diálogos e estado da história
  data/      conteúdo: inimigos, itens, missões, diálogos, NPCs, lore e finais
  ui/        HUD, menus, telas (título, criação, morte, finais)
  post/      pós-processamento (bloom e efeitos de tela)
```

Feito com [Three.js](https://threejs.org) e [Vite](https://vitejs.dev). Fontes: Cinzel, Cinzel Decorative, EB Garamond e Bangers (SIL Open Font License), via [Fontsource](https://fontsource.org).
