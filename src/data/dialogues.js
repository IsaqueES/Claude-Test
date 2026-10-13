// Árvores de diálogo. Texto aceita {nome} e formas de gênero {o|a}.
// Escolhas: { text, next, cond(S), req: {attr,min}|{item}|{gold}|{school}|{karma}, effect(S), end, action }

const bye = (t = 'Até mais.') => ({ text: t, end: true });

export const DIALOGUES = {
  // ======================================================================
  // ANCIÃ MIRELA
  // ======================================================================
  mirela: {
    start(S) {
      if (S.q.atStage('mq1', 'talk_mirela')) return 'intro';
      if (S.q.atStage('mq1', 'get_sword')) return 'remind_bram';
      if (S.q.atStage('mq1', 'farm')) return 'remind_farm';
      if (S.q.atStage('mq1', 'return')) return 'mq1_done';
      if (S.q.isActive('mq2') && !S.q.atStage('mq2', 'mirela2')) return 'remind_shrine';
      if (S.q.atStage('mq2', 'mirela2')) return 'mq2_done';
      if (S.q.isActive('mq3')) return 'remind_isolde';
      if (S.flags.lullaby && !S.flags.mirelaLullaby) return 'lullaby';
      return 'idle';
    },
    nodes: {
      intro: {
        text: 'Ah, {nome}. Eu sabia que você viria hoje. Os corvos voaram para o leste ao amanhecer, e o leite azedou na jarra. Sinais. Sempre sinais. Mostre-me a sua mão.',
        choices: [
          { text: 'A cicatriz está brilhando desde ontem à noite.', next: 'intro2' },
          { text: 'Como a senhora sabia que eu viria?', next: 'intro_how' },
        ],
      },
      intro_how: { text: 'Porque eu sonhei com você. E porque você vem aqui toda vez que tem um pesadelo, desde criança. Agora, a mão.', next: 'intro2' },
      intro2: {
        text: 'Hm. Uma estrela de luz sob a pele... Exatamente como na noite em que você caiu desacordad{o|a} no campo, com aquela pedra cravada na palma. Faz um ano, {nome}. Um ano desde o Eclipse.',
        choices: [
          { text: 'Que pedra era aquela, afinal?', next: 'shard' },
          { text: 'Eu tenho ouvido uma voz nos sonhos. Uma menina.', next: 'voice' },
        ],
      },
      shard: {
        text: 'Um fragmento do Coração de Aether, criança. A joia que sustentava o Véu entre o nosso mundo e o Sonhar. Quando ela se partiu, os pedaços caíram como estrelas. Um deles escolheu você.',
        effect: (S) => { S.codex('coracao'); S.codex('marca'); },
        next: 'voice_q',
      },
      voice_q: { text: 'E me diga... você tem ouvido coisas? Vozes?', choices: [{ text: 'Uma menina. Ela pede para eu encontrar "os pedaços".', next: 'voice' }] },
      voice: {
        text: 'Uma menina... Então é pior do que eu temia. O Sonhar está falando com você através da marca. Isso significa que ele está perto. Muito perto. Os Ecos sentem o cheiro dessa luz como lobos sentem sangue.',
        effect: (S) => S.codex('veu'),
        choices: [
          { text: 'Ecos? Aqui em Brumavale?', next: 'ecos' },
          { text: '[Inteligência 6] Se a marca é um fragmento, ela pode absorver outros fragmentos?', req: { attr: 'int', min: 6 }, next: 'smart' },
        ],
      },
      smart: {
        text: '...Você sempre foi espert{o|a} demais para o seu próprio bem. Sim. Acho que pode. Nenhum mago conseguiu tocar um fragmento sem queimar a mão. Mas você não é um mago. Você é um pedaço do Coração andando por aí.',
        effect: (S) => S.xp(25),
        next: 'ecos',
      },
      ecos: {
        text: 'Marta veio correndo hoje cedo. Diz que há sombras vivas e "bichos de tinta" rondando a fazenda dela. Você não pode enfrentá-los de mãos vazias. Vá até Bram. Ele guarda a espada do seu pai desde o enterro.',
        effect: (S) => { S.codex('ecos'); S.q.advance('mq1'); },
        choices: [{ text: 'Vou falar com Bram.', end: true }, { text: 'Espada do meu pai? Ele nunca me falou disso.', next: 'father' }],
      },
      father: { text: 'Seu pai não falava de muitas coisas. Era um bom homem que preferia consertar arados a contar histórias de guerra. Vá. Bram está na forja, a nordeste da praça.', end: true },
      remind_bram: { text: 'A forja de Bram fica a nordeste da praça. Siga o som do martelo.', end: true },
      remind_farm: { text: 'A fazenda de Marta fica a leste, depois da cerca. Tenha cuidado, {nome}. Ecos odeiam luz e fogo... e você ainda não tem nenhum dos dois.', end: true },
      mq1_done: {
        text: 'Você voltou inteir{o|a}! E os Ecos? ...Entendo. A marca brilhou durante a luta, não brilhou? Ela responde ao perigo.',
        choices: [{ text: 'Brilhou. E a voz ficou mais alta.', next: 'mq1_done2' }],
      },
      mq1_done2: {
        text: 'Então não há mais tempo para ervas e chá. Há um lugar antigo nas colinas a nordeste: o Santuário da Chama. Uma brasa ali queima desde antes do reino existir. Dizem que ela nasceu de uma lasca do Coração. Se a sua marca é o que penso, a chama vai reconhecê-la.',
        choices: [
          { text: 'E se não reconhecer?', next: 'mq1_done3' },
          { text: 'Estou a caminho.', effect: (S) => S.q.advance('mq1'), end: true },
        ],
      },
      mq1_done3: { text: 'Então você terá feito uma bela caminhada e eu terei sido uma velha tola. Não seria a primeira vez. Vá.', effect: (S) => S.q.advance('mq1'), end: true },
      remind_shrine: { text: 'O Santuário da Chama fica no alto da colina, a nordeste. Siga a trilha que sai da estrada norte.', end: true },
      mq2_done: {
        text: 'Eu senti daqui. O chão tremeu, o fogo da lareira ficou verde por um instante. A chama aceitou você, não aceitou?',
        choices: [
          { text: 'Agora consigo invocar fogo. E a menina falou comigo de novo.', next: 'mq2_done2' },
        ],
      },
      mq2_done2: {
        text: 'Então é verdade. Você pode absorver os fragmentos. Ouça bem, {nome}: o Coração se partiu em vários pedaços, e cada um guarda um poder. Se alguém os reunir... pode fechar a Fenda. Ou rasgá-la de vez.',
        next: 'mq2_done3',
      },
      mq2_done3: {
        text: 'E há mais. Uma mulher de armadura chegou hoje à taverna perguntando por "{o|a} portador{|a} da estrela". Diz ser capitã da Guarda Real. Talvez o destino tenha pressa.',
        choices: [{ text: 'Vou encontrá-la.', effect: (S) => S.q.advance('mq2'), end: true }],
      },
      remind_isolde: { text: (S) => (S.q.atStage('mq3', 'meet') ? 'A capitã está na taverna da Rosalina. Não a faça esperar; soldados ficam azedos quando esperam.' : 'O Corvo... Conheci a mãe dele. Uma boa mulher. Ele não é mau, apenas desapontado com o mundo. Às vezes, isso é pior.'), end: true },
      lullaby: {
        text: 'Você está cantarolando algo. "Dorme, estrela, que o vento já vem..." Onde aprendeu essa canção?',
        choices: [{ text: 'Das memórias de Lyra, a filha de Vaelthor.', next: 'lullaby2' }],
      },
      lullaby2: { text: 'A rainha Elara cantava isso para a filha... a esposa de Vaelthor. Se essa menina ainda está presa no Sonhar, {nome}, essa canção pode ser o fio que a traz de volta. Guarde-a no coração.', effect: (S) => { S.set('mirelaLullaby'); S.xp(50); }, end: true },
      idle: {
        text: (S) => (S.flags.riftOpen ? 'A Fenda... consigo vê-la daqui, mesmo de olhos fechados. Vá com a luz, {nome}.' : 'Precisa de algo, criança?'),
        choices: [
          { text: 'Fale-me sobre o Coração de Aether.', next: 'lore_coracao' },
          { text: 'Quem é Vaelthor?', next: 'lore_vaelthor', cond: (S) => S.q.isStarted('mq3') },
          { text: 'O que a senhora sabe sobre o Sonhar?', next: 'lore_sonhar' },
          { text: 'Nada. Até mais.', end: true },
        ],
      },
      lore_coracao: { text: 'Um cristal antigo como as montanhas. Mantinha o Véu esticado como a pele de um tambor. Cada fragmento guarda um elemento: fogo, água, terra, luz. E o núcleo... o núcleo guarda algo que nem os magos entendiam. Talvez um sonho.', next: 'idle' },
      lore_vaelthor: { text: 'Vaelthor foi o maior mago que este reino já viu. Também foi o homem mais triste. Perdeu a esposa cedo e criou a filha sozinho, entre livros e estrelas. Quando o Coração se partiu, ele estava ao lado dele. Tire suas conclusões.', effect: (S) => S.codex('vaelthor'), next: 'idle' },
      lore_sonhar: { text: 'O Sonhar é o lugar para onde vão os pensamentos quando ninguém está olhando. Lá, a mente é a lei. Um medo pode ganhar garras. Um desenho pode ganhar vida. E uma criança corajosa pode mover montanhas.', effect: (S) => S.codex('veu'), next: 'idle' },
    },
  },

  // ======================================================================
  // BRAM, O FERREIRO
  // ======================================================================
  bram: {
    start(S) {
      if (S.q.atStage('mq1', 'get_sword')) return 'sword';
      if (S.q.atStage('sq_tomas', 'return')) return 'tomas_back';
      if (S.q.isDone('mq1') && !S.q.isStarted('sq_tomas')) return 'worried';
      return 'idle';
    },
    nodes: {
      sword: {
        text: 'Hm? Ah. Mirela mandou você, aposto. A velha bruxa tem um dom para saber das coisas antes de todo mundo. Veio buscar a espada do seu pai.',
        choices: [{ text: 'Ela disse que o senhor a guardava.', next: 'sword2' }],
      },
      sword2: {
        text: 'Guardava, não. Você a levou pra casa no dia do enterro e nunca mais devolveu pra eu afiar. Está cega como uma colher, garanto. Me dá aqui.',
        next: 'sword3',
      },
      sword3: {
        text: '*O martelo canta algumas vezes. Faíscas sobem.* Pronto. Não é obra-prima, mas corta. Escute bem, porque não vou repetir: espada não é vassoura. Você golpeia, o inimigo sangra. Ele golpeia, você bloqueia.',
        choices: [{ text: 'Me ensine.', next: 'tutorial' }, { text: 'Eu sei usar uma espada.', next: 'tutorial_skip' }],
      },
      tutorial: {
        text: 'Botão esquerdo: golpe. Clique de novo no ritmo e você encadeia três golpes — o último é pesado. Botão direito: bloqueio. Se bloquear no instante exato do golpe inimigo, você APARA, e o desgraçado fica atordoado. Q: role pra longe. Rolar te deixa intocável por um instante.',
        next: 'tutorial2',
      },
      tutorial2: { text: 'E não fique parado feito poste. Tudo isso gasta vigor, aquela barra verde. Os bonecos de treino ali do lado não reclamam se apanharem. Tome também estas poções. Tecla R. Não me pergunte por quê.', effect: (S) => { S.give('pocao_vida', 3); S.q.advance('mq1'); }, end: true },
      tutorial_skip: { text: 'Hah. Seu pai dizia a mesma coisa, e eu costurei o braço dele duas vezes. Tome estas poções, pelo menos. E vá ver a fazenda da Marta.', effect: (S) => { S.give('pocao_vida', 3); S.q.advance('mq1'); }, end: true },
      worried: {
        text: '*Bram bate no metal com mais força do que o necessário.* ...Desculpe. Cabeça longe. Meu filho, Tomás. Foi entregar espadas pra Guarda Real faz duas semanas e não voltou. Um caçador diz que viu ele amarrado, levado pelos bandidos do Corvo.',
        choices: [
          { text: 'Eu vou trazê-lo de volta.', effect: (S) => { S.start('sq_tomas'); S.karma(3); }, next: 'worried_yes' },
          { text: 'Por que não paga o resgate?', next: 'worried_ransom' },
          { text: 'Não posso ajudar agora.', next: 'worried_no' },
        ],
      },
      worried_yes: { text: 'Você... faria isso? O acampamento fica na Floresta dos Sussurros, a oeste. Traga meu menino, e eu forjo pra você a melhor lâmina que estas mãos já fizeram. Palavra de ferreiro.', end: true },
      worried_ransom: {
        text: 'Pediram quinhentas moedas! Eu não vejo quinhentas moedas juntas desde o casamento. Por favor, {nome}.',
        choices: [{ text: 'Está bem. Vou ajudar.', effect: (S) => { S.start('sq_tomas'); S.karma(3); }, next: 'worried_yes' }, { text: 'Agora não.', next: 'worried_no' }],
      },
      worried_no: { text: '...Entendo. Cada um com seus fardos. Se mudar de ideia, estarei aqui. Martelando.', end: true },
      tomas_back: {
        text: 'Ele chegou! Entrou por aquela porta todo sujo, magro, sorrindo feito bobo... *Bram limpa os olhos com o avental.* É fuligem. É a fuligem.',
        choices: [{ text: 'Fico feliz que ele esteja bem.', next: 'tomas_back2' }],
      },
      tomas_back2: { text: 'Prometi uma lâmina e um ferreiro não volta atrás. Forjei esta noite toda. Equilibrada como uma pena, afiada como a língua da Rosalina. É sua. E a forja estará sempre aberta pra você.', effect: (S) => { S.q.advance('sq_tomas'); S.karma(5); }, end: true },
      idle: {
        text: (S) => (S.flags.tomasFree ? 'O moleque já está martelando melhor que eu. Não conte pra ele. Precisa de algo?' : 'Precisa de algo? Eu tenho ferro pra bater.'),
        choices: [
          { text: 'Quero ver suas armas e armaduras.', action: 'shop:bram', end: true },
          { text: 'Sobre o seu filho...', cond: (S) => S.q.isActive('sq_tomas'), next: 'tomas_status' },
          { text: 'Até mais, Bram.', end: true },
        ],
      },
      tomas_status: { text: 'O acampamento do Corvo fica na floresta, a oeste. Uma paliçada de troncos pontudos. Cuidado com os arqueiros.', next: 'idle' },
    },
  },

  // ======================================================================
  // ROSALINA, A TAVERNEIRA
  // ======================================================================
  rosalina: {
    start(S) { return S.q.atStage('mq2', 'bandits') && !S.flags.denteResolved ? 'scared' : 'idle'; },
    nodes: {
      scared: { text: '*sussurrando* {nome}! Aqueles brutamontes do Corvo querem trinta moedas de "proteção" de cada casa! Faça alguma coisa, por favor!', end: true },
      idle: {
        text: (S) => (S.flags.denteResolved && !S.flags.rosaThanked ? 'Você enxotou aqueles bandidos! Por isso, a próxima torta é por conta da casa. Bem-vind{o|a} ao Javali Dourado!' : 'Bem-vind{o|a} ao Javali Dourado! Torta de maçã, cerveja morna e fofoca fresca.'),
        effect: (S) => { if (S.flags.denteResolved && !S.flags.rosaThanked) { S.set('rosaThanked'); S.give('pao', 2); } },
        choices: [
          { text: 'Quero comprar algo.', action: 'shop:rosalina', end: true },
          { text: 'Quero descansar (quarto).', action: 'rest', end: true },
          { text: 'Alguma fofoca?', next: 'gossip' },
          { text: 'Até logo, Rosalina.', end: true },
        ],
      },
      gossip: {
        text: (S) => {
          if (!S.q.isStarted('sq_moinho')) return 'Dizem que o moinho do Osmar é assombrado! Choro toda noite. Pobre homem, perdeu a esposa faz anos. Talvez você devesse falar com ele.';
          if (!S.q.isStarted('sq_presa')) return 'O Gareth, aquele caçador carrancudo, anda dizendo que um lobo branco do tamanho de um cavalo ronda o norte da floresta. Eu digo que é cerveja demais.';
          if (!S.q.isStarted('sq_tico')) return 'As crianças juram que tem um "bicho desenhado" escondido perto do cemitério. Desenhado! Com tinta! Essas crianças leem histórias demais.';
          if (!S.q.isStarted('sq_pedra')) return 'Ninguém mais vai ao cemitério à noite. Aquela pedra preta que apareceu depois do Eclipse... dizem que ela fala. E que oferece coisas.';
          if (!S.q.isStarted('sq_zefiro')) return 'Há um velho maluco numa torre torta a sudoeste. Zéfiro. Dizem que ele controla o vento. Eu digo que ele controla mal, porque o telhado da torre vive voando.';
          return 'Fofoca? Você é a fofoca, querid{o|a}! Metade da vila jura que você solta fogo pelas mãos. A outra metade jura que é verdade.';
        },
        next: 'idle',
      },
    },
  },

  // ======================================================================
  // CAPITÃ ISOLDE
  // ======================================================================
  isolde: {
    start(S) {
      if (S.q.atStage('mq3', 'meet')) return 'meet';
      if (S.q.atStage('mq3', 'camp')) return 'remind_camp';
      if (S.q.atStage('mq3', 'return')) return 'astrolabe';
      if (S.q.atStage('mq5', 'camp')) return 'mq5';
      if (S.q.atStage('mq5', 'truth')) return 'truth';
      if (S.q.isActive('mq4a') || S.q.isActive('mq4b') || S.q.isActive('mq4c')) return 'shards';
      return 'idle';
    },
    nodes: {
      meet: {
        text: 'Então você é {o|a} portador{|a} da estrela. Capitã Isolde, Guarda Real de Valdren — o que resta dela. Perdoe a franqueza, mas eu esperava alguém... maior.',
        choices: [
          { text: 'E eu esperava alguém mais educad{o|a}.', next: 'meet_rude' },
          { text: 'O que a Guarda Real quer comigo?', next: 'meet2' },
        ],
      },
      meet_rude: { text: '*Ela quase sorri.* Justo. Faz um ano que não durmo direito; a educação foi a primeira a ir embora.', next: 'meet2' },
      meet2: {
        text: 'O Arquimago Vaelthor construiu um Astrolábio capaz de rastrear os fragmentos do Coração. Nós o recuperamos das ruínas da torre... e o perdemos três dias depois. O bando do Corvo emboscou nossa carroça na floresta.',
        effect: (S) => { S.codex('guarda'); S.codex('corvo'); },
        choices: [
          { text: 'E você quer que eu o recupere.', next: 'meet3' },
          { text: 'Por que não manda seus soldados?', next: 'meet_soldiers' },
        ],
      },
      meet_soldiers: { text: 'Que soldados? Tenho vinte e três homens e mulheres cansados guardando um acampamento ao sul do castelo, para que os Ecos não desçam até as vilas. Se eu os tirar de lá, Brumavale queima.', next: 'meet3' },
      meet3: {
        text: 'O Corvo foi sargento sob meu comando. Desertou quando o rei sumiu. Ele é perigoso, mas não é tolo. Talvez você consiga o que eu não consegui: falar com ele. Ou não. A escolha é sua, desde que me traga o Astrolábio.',
        choices: [
          { text: 'Eu vou buscá-lo.', effect: (S) => S.q.advance('mq3'), next: 'meet_end' },
          { text: 'O que aconteceu com o rei?', next: 'meet_king' },
        ],
      },
      meet_king: { text: 'O Rei Aldren desapareceu na Noite do Eclipse. Mas ele vive, eu sei. Ele jurou que Valdren nunca conheceria a fome, e cumpriu. Um homem assim não some. Quando fecharmos a Fenda, vamos encontrá-lo.', effect: (S) => S.codex('aldren'), choices: [{ text: 'Vou buscar o Astrolábio.', effect: (S) => S.q.advance('mq3'), next: 'meet_end' }] },
      meet_end: { text: 'O acampamento fica na Floresta dos Sussurros, a oeste, por uma trilha que sai da estrada. Volte vivo. Volte com o Astrolábio. De preferência nessa ordem.', end: true },
      remind_camp: { text: 'O acampamento do Corvo, a oeste. Não me faça ir buscar você também.', end: true },
      astrolabe: {
        text: (S) => `${S.flags.corvoFate === 'ally' ? 'Você convenceu o Corvo a lutar conosco? ...Eu tentei por meses. ' : S.flags.corvoFate === 'killed' ? 'O Corvo está morto. Era um traidor... mas já foi um bom soldado. ' : ''}O Astrolábio! Deixe-me ver. Aproxime a sua mão marcada.`,
        next: 'astrolabe2',
      },
      astrolabe2: {
        text: '*Os anéis dourados giram sozinhos. Três feixes de luz se projetam sobre o mapa: oeste, noroeste e leste.* O Lago Espelhado. Os Picos de Granito. O Templo do Sol Caído. Três fragmentos. Com o que você já carrega, quatro.',
        next: 'astrolabe3',
      },
      astrolabe3: {
        text: 'Com quatro fragmentos ressoando, a barreira que Vaelthor ergueu ao redor do castelo pode ser rompida. Vou voltar ao acampamento da Guarda, ao sul do castelo. Quando tiver os três, me encontre lá.',
        choices: [{ text: 'Conte comigo, Capitã.', effect: (S) => { S.take('astrolabio'); S.q.advance('mq3'); }, end: true }],
      },
      shards: { text: 'Lago a oeste, montanhas a noroeste, templo a leste. A ordem é sua. Os fragmentos não vão a lugar nenhum... espero.', end: true },
      mq5: {
        text: 'Você conseguiu. Consigo sentir daqui — o ar vibra perto de você. Quatro fragmentos. Meus soldados estão prontos. Quando você romper a barreira, os Ecos vão sair do castelo como vespas de um ninho chutado.',
        choices: [
          { text: 'Então vamos chutar o ninho.', effect: (S) => S.q.advance('mq5'), next: 'mq5_go' },
          { text: 'E se o rei estiver lá dentro?', next: 'mq5_king' },
        ],
      },
      mq5_king: { text: 'Então eu o trarei para casa. E Vaelthor responderá pelo que fez. Vamos.', effect: (S) => S.q.advance('mq5'), next: 'mq5_go' },
      mq5_go: { text: 'O portão sul do castelo, no alto da colina. Eu irei logo atrás de você.', end: true },
      truth: {
        text: (S) => (S.flags.readDiary ? 'Você está com uma cara terrível. O que encontrou lá dentro? O rei... há notícias do rei?' : 'O castelo está livre, mas nem sinal do rei. E você? Encontrou alguma coisa?'),
        choices: [
          { text: 'O rei usou Lyra num ritual. Ele causou o Eclipse.', cond: (S) => S.flags.readDiary, next: 'truth_tell' },
          { text: 'Não encontrei nada sobre o rei.', next: 'truth_hide' },
        ],
      },
      truth_tell: {
        text: '...Não. Isso é mentira. Deixe-me ver esse diário. *Ela lê em silêncio. As mãos tremem.* "Ela precisa sobreviver." Ele escreveu isso sobre uma criança. Sobre a filha do seu próprio mago.',
        next: 'truth_tell2',
      },
      truth_tell2: {
        text: 'Passei um ano defendendo a memória de um homem que sacrificaria uma menina para viver mais. *Ela endireita os ombros.* Minha lealdade é a Valdren, {nome}. Não a uma coroa. Se ainda houver uma chance de salvar essa menina, eu luto por ela.',
        effect: (S) => { S.set('isoldeTruth', 'told'); S.karma(5); S.record('Contou a verdade a Isolde'); },
        next: 'truth_end',
      },
      truth_hide: {
        text: 'Então Vaelthor deve ter matado o rei e escondido o corpo. *Ela aperta o cabo da espada.* Quando o encontrarmos na Fenda, eu mesma vou fazer justiça. Pelo Rei Aldren.',
        effect: (S) => { S.set('isoldeTruth', S.flags.readDiary ? 'hidden' : 'unknown'); if (S.flags.readDiary) S.record('Escondeu a verdade de Isolde'); },
        next: 'truth_end',
      },
      truth_end: { text: 'O portão norte está aberto. A Fenda espera. Tome esta armadura — era do comandante da guarda. Ele não vai precisar dela. Que a luz guie você, {nome}.', effect: (S) => S.q.advance('mq5'), end: true },
      idle: {
        text: (S) => (S.flags.riftOpen ? 'A Fenda está aberta. Não espere por mim — a Guarda vai segurar os Ecos aqui fora.' : 'Precisa de algo, soldado?'),
        choices: [{ text: 'Só passando.', end: true }],
      },
    },
  },

  // ======================================================================
  // DENTE-DE-FERRO (bandidos na praça)
  // ======================================================================
  dente: {
    start: () => 'start',
    nodes: {
      start: {
        text: 'Olha só, mais um aldeão querendo ser herói. Escuta aqui, coisinha: o Corvo protege esta estrada, e proteção custa trinta moedas por casa. Ou a gente começa a proteger com fogo.',
        choices: [
          { text: 'Saiam da minha vila. Agora.', next: 'fight' },
          { text: '[Carisma 5] O Corvo sabe que vocês extorquem vilas de fazendeiros? Que lenda vergonhosa.', req: { attr: 'car', min: 5 }, next: 'persuade' },
          { text: '[Força 6] Mais um passo e você vai engolir esses dentes de ferro.', req: { attr: 'for', min: 6 }, next: 'intimidate' },
          { text: 'Aqui estão 30 moedas. Deixem a vila em paz.', req: { gold: 30 }, next: 'pay' },
        ],
      },
      fight: { text: 'Hah! Rapazes, ensinem bons modos a{o|à} {herói|heroína}!', effect: (S) => S.denteFight(), end: true },
      persuade: {
        text: '...O Corvo disse pra cobrar dos nobres, não de... *ele olha para Rosalina, para as crianças.* Tá. Tá bom. Mas se ele perguntar, você é que vai explicar. Vamos embora, rapazes.',
        effect: (S) => { S.set('banditsPersuaded'); S.karma(5); S.denteLeave(); S.record('Convenceu os bandidos a deixar Brumavale'); },
        end: true,
      },
      intimidate: { text: '*Ele olha para a sua mão, que começa a brilhar.* E-ei, calma. Ninguém falou nada de magia. A gente já tava indo mesmo.', effect: (S) => { S.set('banditsIntimidated'); S.denteLeave(); }, end: true },
      pay: { text: 'Viu só? Não doeu nada. Prazer fazer negócios com Brumavale!', effect: (S) => { S.gold(-30); S.set('banditsPaid'); S.denteLeave(); S.record('Pagou os bandidos'); }, end: true },
    },
  },

  // ======================================================================
  // CORVO
  // ======================================================================
  corvo: {
    start(S, npc) {
      if (npc && npc.id === 'corvo_aliado') return 'ally_idle';
      if (S.q.atStage('sq_presa', 'trophy') && S.flags.corvoWantsFang && S.has('presa_alfa')) return 'fang';
      if (S.flags.corvoWantsFang) return 'waiting_fang';
      if (S.flags.banditsFought && !S.flags.corvoTalked) return 'angry';
      if (!S.q.isStarted('mq3') || S.q.isDone('mq3') || S.has('astrolabio')) return 'idle_early';
      return 'start';
    },
    nodes: {
      idle_early: { text: (S) => (S.has('astrolabio') ? 'Você já tem o que veio buscar. Some daqui antes que eu mude de ideia.' : 'Turismo na floresta? Péssima época. Volte quando tiver negócios a tratar.'), end: true },
      angry: {
        text: 'Você. Você é quem matou o Dente-de-Ferro e os garotos dele na praça. Eles eram idiotas, mas eram MEUS idiotas.',
        effect: (S) => S.set('corvoTalked'),
        choices: [
          { text: 'Eles estavam extorquindo pessoas inocentes.', next: 'angry2' },
          { text: 'E você vai ser o próximo se não me der o Astrolábio.', next: 'fight' },
        ],
      },
      angry2: {
        text: '*Ele fica em silêncio por um tempo.* ...Eu mandei cobrar dos nobres. Não de fazendeiros. Idiotas. Mesmo assim, sangue pede sangue. O que você quer?',
        next: 'start_q',
      },
      start: {
        text: 'Ora, ora. {o|a} famos{o|a} portador{|a} da estrela. As notícias correm rápido na floresta. Deixa eu adivinhar: veio buscar o brinquedinho dourado do Arquimago.',
        effect: (S) => S.set('corvoTalked'),
        next: 'start_q',
      },
      start_q: {
        text: 'Então? Fale logo. Meus arqueiros têm dedos impacientes.',
        choices: [
          { text: 'Entregue o Astrolábio, ou eu o tomarei à força.', next: 'fight' },
          { text: '[Carisma 7] A Fenda vai engolir seu bando junto com o reino. Lute ao nosso lado.', req: { attr: 'car', min: 7 }, cond: (S) => !S.flags.banditsPersuaded, next: 'ally' },
          { text: '[Carisma 5] Seus homens deixaram Brumavale em paz quando pedi. Você tem honra. Use-a: lute conosco.', req: { attr: 'car', min: 5 }, cond: (S) => S.flags.banditsPersuaded, next: 'ally' },
          { text: '[Força 7] Vamos resolver como guerreiros. Um duelo, só nós dois.', req: { attr: 'for', min: 7 }, next: 'duel' },
          { text: 'Quanto você quer pelo Astrolábio?', next: 'deal' },
          { text: 'Sobre Tomás, o filho do ferreiro...', cond: (S) => S.q.isActive('sq_tomas') && !S.flags.tomasFree, next: 'tomas' },
        ],
      },
      fight: { text: 'Gosto de gente direta. É mais fácil de enterrar. Rapazes!', effect: (S) => S.startCorvoFight(false), end: true },
      duel: {
        text: '*Ele ri alto e joga a capa para trás.* Um duelo! Faz anos que ninguém tem coragem de me propor isso. Ninguém interfere, ouviram? Se eu cair, o Astrolábio é seu.',
        effect: (S) => S.startCorvoFight(true),
        end: true,
      },
      ally: {
        text: '*Corvo tira a máscara. Por baixo, um rosto cansado, cheio de cicatrizes.* Sabe por que desertei? Porque os nobres fugiram com o ouro e deixaram os soldados morrendo nas muralhas. Ninguém lutou por nós.',
        next: 'ally2',
      },
      ally2: {
        text: 'E agora você aparece pedindo que eu lute pelo reino que me abandonou. *Silêncio.* ...Mas você não está pedindo pelo reino, está? Está pedindo pelas pessoas. Tá. Pegue o Astrolábio. E isto — minha insígnia. Quando a hora chegar, o Corvo vai voar ao seu lado.',
        effect: (S) => { S.set('corvoFate', 'ally'); S.give('astrolabio'); S.give('insignia_corvo'); S.give('chave_cela'); S.karma(10); S.record('Fez do Corvo um aliado'); },
        choices: [{ text: 'Obrigad{o|a}, Corvo.', end: true }],
      },
      deal: {
        text: 'Agora sim, uma conversa civilizada. Duzentas moedas. Ou... um favor. Tem um lobo branco gigante, a Presa-Branca, matando meus batedores ao norte da floresta. Traga a presa dele e o Astrolábio é seu.',
        choices: [
          { text: 'Aqui estão 200 moedas.', req: { gold: 200 }, effect: (S) => { S.gold(-200); S.set('corvoFate', 'deal'); S.give('astrolabio'); S.give('chave_cela'); S.record('Comprou o Astrolábio do Corvo'); }, next: 'deal_paid' },
          { text: 'Vou caçar o lobo.', effect: (S) => { S.set('corvoWantsFang'); if (!S.q.isStarted('sq_presa')) S.start('sq_presa'); }, next: 'deal_hunt' },
          { text: 'Esqueça. Vou tomar à força.', next: 'fight' },
        ],
      },
      deal_paid: { text: 'Pode contar — está tudo aí. E leve a chave da jaula também; o filho do ferreiro come demais. Foi um prazer.', end: true },
      deal_hunt: { text: 'A toca fica ao norte daqui, perto das montanhas. Siga os ossos. E não morra, porque aí eu fico sem lobo E sem cliente.', end: true },
      waiting_fang: { text: 'Cadê minha presa de lobo? Não volte de mãos vazias.', choices: [{ text: 'Mudei de ideia. Aqui estão 200 moedas.', req: { gold: 200 }, effect: (S) => { S.gold(-200); S.set('corvoWantsFang', false); S.set('corvoFate', 'deal'); S.give('astrolabio'); S.give('chave_cela'); }, next: 'deal_paid' }, { text: 'Já estou indo.', end: true }] },
      fang: {
        text: 'Por todos os corvos do céu... Você matou mesmo a Presa-Branca. *Ele pesa o dente na mão.* Negócio é negócio. O Astrolábio. E a chave da jaula, de brinde.',
        effect: (S) => { S.take('presa_alfa'); S.set('corvoWantsFang', false); S.set('corvoFate', 'deal'); S.give('astrolabio'); S.give('chave_cela'); S.set('fangToCorvo'); S.record('Trocou a presa do lobo pelo Astrolábio'); },
        end: true,
      },
      tomas: {
        text: 'O garoto do ferreiro? Achamos que valia um resgate. Mas ele come como três e reclama como dez. Se quiser, ele é seu — junto com o Astrolábio, se fecharmos negócio.',
        next: 'start_q',
      },
      ally_idle: { text: 'Não é todo dia que um bandido vira herói. Não conta pra ninguém, vai estragar minha reputação.', end: true },
    },
  },

  corvo_derrota: {
    start: () => 'start',
    nodes: {
      start: {
        text: (S) => (S.flags.corvoDuel ? '*Corvo cai de joelhos, rindo e sangrando.* Hah... hah. Faz tempo que não perco. Um trato é um trato. O Astrolábio é seu.' : '*Corvo cai de joelhos, arfando.* Chega... chega. Você venceu. Pegue o maldito Astrolábio. Mas antes... vai me matar ou não?'),
        choices: [
          { text: 'Levante-se. Você lutou com honra.', cond: (S) => S.flags.corvoDuel, effect: (S) => { S.set('corvoFate', 'respect'); S.karma(5); S.record('Venceu o Corvo em duelo e ganhou seu respeito'); }, next: 'respect' },
          { text: 'Vá embora e não volte a roubar.', cond: (S) => !S.flags.corvoDuel, effect: (S) => { S.set('corvoFate', 'spared'); S.karma(8); S.record('Poupou o Corvo'); }, next: 'spared' },
          { text: 'Você ameaçou pessoas inocentes. Isso acaba aqui.', effect: (S) => { S.set('corvoFate', 'killed'); S.karma(-12); S.record('Executou o Corvo'); }, next: 'killed' },
        ],
      },
      respect: { text: 'Você tem o braço de um soldado e o coração de... sei lá, de alguém melhor que eu. Quando enfrentar o Arquimago, me procure no acampamento da Guarda. Vou estar lá. Não pergunte por quê.', effect: (S) => S.corvoAftermath(), end: true },
      spared: { text: '...Uma segunda chance. Hah. Ninguém nunca me deu uma dessas. Não vou desperdiçar. Adeus, portador{|a}.', effect: (S) => S.corvoAftermath(), end: true },
      killed: { text: '*Ele fecha os olhos.* ...Justo. Diga à Isolde... que eu sinto muito pela carroça.', effect: (S) => S.corvoAftermath(), end: true },
    },
  },

  bandidos: {
    start: () => 'start',
    nodes: {
      start: {
        text: (S) => (S.flags.corvoFate === 'ally' ? 'O chefe disse que agora a gente é "do bem". Vai entender.' : S.flags.corvoFate ? 'Sem confusão, ok? A gente só quer comer em paz.' : 'Fala com o chefe, ali na torre. A gente só obedece.'),
        end: true,
      },
    },
  },

  // ======================================================================
  // TOMÁS
  // ======================================================================
  tomas: {
    start(S, npc) { return npc && npc.id === 'tomas_casa' ? 'home' : 'cage'; },
    nodes: {
      cage: {
        text: 'Ei! Ei, você! Você é de Brumavale, não é? Sou Tomás, filho do Bram! Pelo amor de todos os santos, me tira daqui! Eles me fazem descascar batata o dia inteiro!',
        choices: [
          { text: 'Seu pai me mandou. Vou te soltar.', next: 'cage_help', cond: (S) => S.q.isActive('sq_tomas') },
          { text: 'Vou ver o que posso fazer.', next: 'cage_help' },
        ],
      },
      cage_help: { text: 'A chave fica com o Corvo. Ou... se você for forte, pode arrebentar o cadeado. Ou habilidos{o|a} o bastante pra abrir com um grampo. Interaja com a jaula!', effect: (S) => { if (!S.q.isStarted('sq_tomas')) S.start('sq_tomas'); }, end: true },
      home: { text: 'Meu pai não para de sorrir. É assustador. Obrigado por me tirar de lá, {nome}. Se precisar de algo da forja, é só falar com a gente.', end: true },
    },
  },

  // ======================================================================
  // FABRÍCIO, O MERCADOR
  // ======================================================================
  fabricio: {
    start: () => 'start',
    nodes: {
      start: {
        text: (S) => (S.attr('car') >= 8 ? 'Meu cliente favorit{o|a}! Para você, preços de amigo. De amigo próximo. Quase parente.' : 'Bem-vind{o|a} ao Bazar de Fabrício! Se não tenho, é porque não existe. Se existe, é caro. Se é caro, vale a pena!'),
        choices: [
          { text: 'Mostre-me suas mercadorias.', action: 'shop:fabricio', end: true },
          { text: 'De onde vêm todas essas coisas?', next: 'where' },
          { text: 'Até mais.', end: true },
        ],
      },
      where: { text: 'Daqui, dali, de lugares que não convém mencionar perto da Guarda Real. Brincadeira! ...Na maioria.', next: 'start' },
    },
  },

  // ======================================================================
  // IRMÃ CELESTE
  // ======================================================================
  celeste: {
    start(S) {
      if (S.q.atStage('sq_flores', 'return')) return 'flowers_done';
      if (S.q.isDone('mq1') && !S.q.isStarted('sq_flores')) return 'ask';
      return 'idle';
    },
    nodes: {
      ask: {
        text: 'Que a luz esteja com você, {nome}. Perdoe-me pedir, mas meus estoques de remédio acabaram. Os feridos pelos Ecos chegam todos os dias com feridas que não fecham. Preciso de Flores-da-Lua.',
        choices: [
          { text: 'Onde as encontro?', next: 'ask2' },
          { text: 'Agora não posso, Irmã.', end: true },
        ],
      },
      ask2: { text: 'Crescem em clareiras da floresta e nas colinas. Durante o dia são difíceis de ver, mas à noite brilham como prata. Cinco bastariam. Eu lhe pagaria com o pouco que tenho... e com algo especial que guardo.', effect: (S) => S.start('sq_flores'), end: true },
      flowers_done: {
        text: 'Cinco Flores-da-Lua! Que a luz o abençoe. Estas pobres almas vão dormir sem dor esta noite. E, como prometi... algo especial.',
        effect: (S) => S.take('flor_lua', 5),
        next: 'flowers_done2',
      },
      flowers_done2: {
        text: 'Na noite do Eclipse, uma borboleta feita de luz entrou pela janela da capela. Prendi-a neste pote. Ela nunca se apaga... e às vezes canta. Uma canção de ninar. Sinto que pertence a você.',
        effect: (S) => { S.q.advance('sq_flores'); S.memory(5); },
        end: true,
      },
      idle: {
        text: 'A luz guia quem a procura. Posso ajudar?',
        choices: [
          { text: 'Preciso de poções.', action: 'shop:celeste', end: true },
          { text: 'Pode me abençoar?', next: 'bless' },
          { text: 'Até mais, Irmã.', end: true },
        ],
      },
      bless: { text: (S) => (S.story.karma > 30 ? 'Você não precisa da minha bênção, criança. A luz já brilha forte em você.' : S.story.karma < -30 ? '*Ela hesita.* Há uma sombra em você, {nome}. Ainda não é tarde para deixá-la para trás.' : 'Que a luz ilumine seu caminho e aqueça suas mãos. Vá em paz.'), effect: (S) => S.healFull(), next: 'idle' },
    },
  },

  // ======================================================================
  // DONA MARTA
  // ======================================================================
  marta: {
    start(S) {
      if (S.q.atStage('mq1', 'farm')) return 'hiding';
      if (S.q.atStage('sq_ovelhas', 'return')) return 'sheep_done';
      if (S.flags.farmSaved && !S.q.isStarted('sq_ovelhas')) return 'thanks';
      return 'idle';
    },
    nodes: {
      hiding: { text: '*De dentro da casa* Tem uma coisa lá fora! Uma sombra com olhos roxos e um... um BONECO DE TINTA! Ele chutou meu balde!', end: true },
      thanks: {
        text: 'Você espantou aquelas coisas! Bendita seja! Mas que tragédia, minhas três ovelhas fugiram de medo. A Branquinha, a Fuligem e a Dona Bolota. Sem elas, nada de queijo este inverno.',
        choices: [
          { text: 'Eu as trago de volta.', effect: (S) => S.start('sq_ovelhas'), next: 'thanks2' },
          { text: 'Ovelhas não são bem a minha especialidade.', end: true },
        ],
      },
      thanks2: { text: 'Uma foi pro lado do rio, a leste. Outra pros campos ao norte. E a Dona Bolota, aquela gulosa, deve estar perto do moinho. Chegue perto delas e chame com jeitinho. Elas seguem quem tem cara de boa pessoa!', end: true },
      sheep_done: { text: 'Branquinha! Fuligem! Dona Bolota! *Ela abraça cada uma.* Você é um anjo, {nome}. Tome, o melhor queijo da região, curado por sete luas. E umas moedinhas.', effect: (S) => { S.q.advance('sq_ovelhas'); S.karma(3); }, end: true },
      idle: { text: (S) => (S.q.isActive('sq_ovelhas') ? 'Achou minhas ovelhas? Rio a leste, campos ao norte, moinho ao sul!' : 'Cuidado na estrada, querid{o|a}. E coma direito!'), end: true },
    },
  },

  // ======================================================================
  // OSMAR, O MOLEIRO + HELENA
  // ======================================================================
  osmar: {
    start(S) {
      if (S.q.atStage('sq_moinho', 'osmar')) return 'end_' + (S.flags.helenaFate || 'freed');
      if (!S.q.isStarted('sq_moinho')) return 'ask';
      return 'idle';
    },
    nodes: {
      ask: {
        text: '*Um homem de olhos fundos varre farinha que não existe.* Você ouviu também? Todas as noites, desde o Eclipse. Um choro, vindo do moinho. É a minha Helena. Morreu no rio há doze anos. Eu sei que é ela.',
        choices: [
          { text: 'Vou investigar à noite.', effect: (S) => S.start('sq_moinho'), next: 'ask_yes' },
          { text: 'Fantasmas não existem, Osmar.', next: 'ask_no' },
        ],
      },
      ask_yes: { text: 'Obrigado. Se for mesmo ela... diga que eu ainda guardo o lugar dela à mesa.', end: true },
      ask_no: { text: 'Bichos de tinta andam pelas estradas e você me diz que fantasmas não existem? ...Por favor. Só uma noite.', choices: [{ text: 'Tudo bem. Vou investigar.', effect: (S) => S.start('sq_moinho'), next: 'ask_yes' }, { text: 'Não.', end: true }] },
      idle: { text: 'O choro... você ouviu? Ele começa depois das nove da noite.', end: true },
      end_freed: { text: 'Esta noite, pela primeira vez em doze anos, não houve choro. Houve... uma canção. A que ela cantava enquanto moía o trigo. Ela está em paz. Obrigado, {nome}. Tome — era do meu avô. Não tenho mais ninguém a quem dar.', effect: (S) => { S.gold(120); S.q.advance('sq_moinho'); S.karma(5); }, end: true },
      end_banished: { text: 'Ela se foi. Você a mandou embora com sua luz. Talvez tenha sido o melhor. Talvez. Obrigado... eu acho.', effect: (S) => { S.gold(50); S.q.advance('sq_moinho'); }, end: true },
      end_betrayed: { text: 'O choro ficou pior. Mais alto. Mais triste. O que você fez? ...Não. Não quero saber. Vá embora do meu moinho.', effect: (S) => S.q.advance('sq_moinho'), end: true },
    },
  },

  helena: {
    start(S) {
      if (S.q.atStage('sq_moinho', 'return_ring')) return 'ring_back';
      return 'start';
    },
    nodes: {
      start: {
        text: '*Uma mulher translúcida flutua sobre a água, com os pés que não tocam nada.* ...Você me vê? Ninguém me vê há tanto tempo. O Véu está fino... e eu acordei. Eu perdi... perdi meu anel. No rio. Na noite em que caí.',
        effect: (S) => S.set('helenaMet'),
        choices: [
          { text: 'Vou encontrar seu anel.', effect: (S) => S.q.advance('sq_moinho', 'ring'), next: 'search' },
          { text: '[Luz] Você não pertence mais a este mundo. Descanse.', req: { school: 'luz', schoolName: 'Luz' }, next: 'banish' },
          { text: 'Osmar ainda guarda seu lugar à mesa.', next: 'osmar' },
        ],
      },
      osmar: { text: 'Osmar... meu Osmar. Ele ainda varre o moinho? Ele sempre varria quando estava triste. Por favor... o anel. Sem ele não consigo partir.', choices: [{ text: 'Vou encontrá-lo.', effect: (S) => S.q.advance('sq_moinho', 'ring'), next: 'search' }] },
      search: { text: 'No rio, perto daqui, onde a água brilha ao luar... Por favor.', end: true },
      banish: {
        text: '*Sua mão se enche de luz. Helena olha para ela, depois para você.* ...Que seja. Diga a Osmar que... *A luz a dissolve antes que ela termine.*',
        effect: (S) => { S.set('helenaFate', 'banished'); S.q.advance('sq_moinho', 'osmar'); S.record('Baniu o fantasma de Helena'); },
        end: true,
      },
      ring_back: {
        text: 'Você o encontrou! Eu sinto... sinto o calor dele daqui. Por favor, me dê.',
        choices: [
          { text: 'Aqui está. Descanse em paz, Helena.', effect: (S) => { S.take('anel_helena'); S.set('helenaFate', 'freed'); S.karma(10); S.record('Devolveu o anel a Helena'); }, next: 'freed' },
          { text: 'Este anel vale uma fortuna. Vou ficar com ele.', effect: (S) => { S.set('helenaFate', 'betrayed'); S.karma(-12); S.record('Ficou com o anel de Helena'); }, next: 'betrayed' },
        ],
      },
      freed: { text: '*Ela coloca o anel no dedo transparente e sorri.* Diga a Osmar que eu nunca deixei de amá-lo. E que ele pare de varrer o moinho à toa. *Ela se desfaz em pétalas de luz.*', effect: (S) => S.q.advance('sq_moinho'), end: true },
      betrayed: { text: '*O rosto dela se contorce. O grito faz a água ferver.* LADRÃO! LADRÃO! *Ela desaparece, mas o lamento continua ecoando pelo vale.*', effect: (S) => S.q.advance('sq_moinho'), end: true },
    },
  },

  // ======================================================================
  // GARETH, O CAÇADOR
  // ======================================================================
  gareth: {
    start(S) {
      if (S.q.atStage('sq_presa', 'trophy')) return S.has('presa_alfa') ? 'trophy' : S.flags.fangToCorvo ? 'trophy_corvo' : 'trophy_none';
      if (!S.q.isStarted('sq_presa')) return 'ask';
      return 'idle';
    },
    nodes: {
      ask: {
        text: 'Hm. Você é quem solta fogo pelas mãos. Então talvez sirva. Tem um lobo ao norte da floresta. Branco. Grande como um cavalo. Matou três caçadores e um dos batedores do Corvo. Chamam de Presa-Branca.',
        choices: [{ text: 'Vou caçá-lo.', effect: (S) => S.start('sq_presa'), next: 'ask2' }, { text: 'Parece perigoso demais.', next: 'ask_no' }],
      },
      ask2: { text: 'A toca fica entre a floresta e as montanhas, no norte. Siga os ossos. Ele uiva e chama a matilha quando se fere. Mate os pequenos primeiro, ou eles te cercam.', end: true },
      ask_no: { text: 'É perigoso. É por isso que estou pedindo a você e não ao padeiro.', end: true },
      idle: { text: 'Siga os ossos ao norte. E não deixe ele te cercar.', end: true },
      trophy: {
        text: '*Ele gira a presa enorme entre os dedos.* Você conseguiu. Faz anos que ninguém me surpreende. Fique com o manto que eu costurei para quem matasse aquela fera. Você o mereceu.',
        effect: (S) => { S.take('presa_alfa'); S.give('manto_lobo'); S.q.advance('sq_presa'); },
        end: true,
      },
      trophy_corvo: { text: 'Deu a presa pro Corvo? ...Tanto faz. O lobo está morto, é o que importa. Tome isso pelo trabalho.', effect: (S) => { S.give('colar_presas'); S.q.advance('sq_presa'); }, end: true },
      trophy_none: { text: 'Cadê a prova? Sem presa, sem recompensa.', end: true },
    },
  },

  // ======================================================================
  // CRIANÇAS
  // ======================================================================
  criancas: {
    start(S) { return !S.q.isStarted('sq_tico') ? 'tico' : S.flags.ticoColorful ? 'happy' : 'hero'; },
    nodes: {
      tico: { text: 'Psiu! Você quer saber um segredo? Tem um bicho desenhado escondido perto do cemitério! Ele tem olhos enormes e fala "boing"! A mamãe disse que é mentira, mas é VERDADE!', end: true },
      hero: { text: (S) => (S.stats.level > 5 ? 'Você é {o|a} {herói|heroína} da estrela! Me ensina a soltar fogo? Por favorzinho?' : 'Você vai salvar o reino? Meu pai disse que heróis comem verdura. Você come verdura?'), end: true },
      happy: { text: 'O Tico agora é colorido!! Ele fez um desenho de um cavalo e o cavalo saiu correndo!! Foi o melhor dia da minha vida!!', end: true },
    },
  },

  aldeao: {
    start: (S) => 'l' + Math.floor(Math.random() * 6),
    nodes: {
      l0: { text: (S) => (S.q.isDone('mq2') ? 'É verdade que você carrega um pedaço do Coração? Posso tocar? ...Brincadeira. Mais ou menos.' : 'Dizem que os Ecos só aparecem à noite... mas ontem vi um ao meio-dia!'), end: true },
      l1: { text: 'Meu avô dizia que o Coração de Aether cantava nas noites de lua cheia. Agora só se ouve o vento.', end: true },
      l2: { text: 'A torta de maçã da Rosalina é a melhor do reino. E a única, desde que a Fenda abriu.', end: true },
      l3: { text: (S) => (S.flags.riftOpen ? 'Dá pra ver a Fenda pulsando lá no norte. Que os deuses protejam você.' : 'Aquele risco roxo no céu, ao norte... às vezes parece que ele está olhando pra gente.'), end: true },
      l4: { text: 'Se for viajar, use as pedras-guia. Os antigos as colocaram pelo reino. Basta tocar numa para lembrar o caminho.', end: true },
      l5: { text: (S) => (S.story.karma < -30 ? '*O aldeão desvia o olhar e se afasta rapidamente.*' : S.story.karma > 30 ? 'Bom dia, {nome}! As crianças não param de falar de você!' : 'Bom dia. Dia bonito, apesar do céu rasgado.'), end: true },
    },
  },

  guarda: {
    start: () => 'start',
    nodes: {
      start: { text: (S) => (S.flags.riftOpen ? 'Seguramos o perímetro. Vá, portador{|a}. Feche aquela coisa.' : S.flags.castleOpen ? 'O castelo está aberto! Primeira boa notícia em um ano.' : 'Atenção redobrada, os Ecos atacam ao anoitecer. Fale com a Capitã se tiver assuntos.'), end: true },
    },
  },

  bento: {
    start: () => 'start',
    nodes: {
      start: {
        text: 'Sargento Bento, intendente. Se é da Guarda ou amigo da Capitã, tenho suprimentos. A preço justo — a guerra é cara.',
        choices: [{ text: 'Mostre os suprimentos.', action: 'shop:bento', end: true }, { text: 'Até mais, Sargento.', end: true }],
      },
    },
  },

  // ======================================================================
  // THALIA, A DRUIDA + ESPÍRITO DO LAGO
  // ======================================================================
  thalia: {
    start(S) {
      if (S.q.atStage('mq4a', 'thalia')) return 'meet';
      if (S.q.atStage('mq4a', 'roots')) return 'remind';
      if (S.q.atStage('mq4a', 'ritual')) return 'ritual';
      return 'idle';
    },
    nodes: {
      meet: {
        text: '*A druida não se vira.* Seus passos têm cheiro de cinza e estrela. Você é {o|a} que carrega o fogo do Coração. A floresta sussurra seu nome há dias.',
        choices: [{ text: 'O Astrolábio apontou para o lago.', next: 'meet2' }, { text: 'A floresta sussurra? Literalmente?', next: 'meet_whisper' }],
      },
      meet_whisper: { text: 'Por que acha que se chama Floresta dos Sussurros? Os nomes antigos raramente mentem.', next: 'meet2' },
      meet2: {
        text: 'O Fragmento da Água está no Lago Espelhado, guardado por Ondina, o espírito do lago. Mas ela está doente. Três raízes corrompidas pela Fenda cresceram ao redor da margem e bebem a força dela.',
        effect: (S) => S.codex('espirito_lago'),
        choices: [{ text: 'Como destruo as raízes?', next: 'meet3' }],
      },
      meet3: { text: 'A corrupção do Sonhar não teme o aço. Só o fogo a purifica. O fogo que você carrega. Queime as três raízes, e eu farei o ritual para despertar Ondina.', effect: (S) => S.q.advance('mq4a'), end: true },
      remind: { text: 'Três raízes negras ao redor do lago. Use o fogo. E cuidado: os Ecos as protegem como cães protegem o dono.', end: true },
      ritual: {
        text: 'Sinto o lago respirando de novo. Venha. Fique ao meu lado enquanto eu chamo Ondina. *Thalia ergue o cajado e canta numa língua que soa como chuva.*',
        effect: (S) => { S.q.advance('mq4a'); S.spiritRitual(); },
        end: true,
      },
      idle: { text: (S) => (S.q.isDone('mq4a') ? 'O lago canta outra vez. A floresta não esquecerá o que você fez.' : 'A floresta observa. Sempre.'), end: true },
    },
  },

  espirito: {
    start: () => 'start',
    nodes: {
      start: {
        text: '*Uma mulher feita de água se ergue do lago, cintilando.* Pequen{o|a} portador{|a}... você queimou as raízes que me sufocavam. Faz um ano que não vejo o céu refletido em mim.',
        choices: [{ text: 'Vim buscar o Fragmento da Água.', next: 'shard' }],
      },
      shard: {
        text: 'Eu sei. Ele caiu em mim como uma lágrima, na Noite do Eclipse. E com ele veio um sonho: uma menina de luz que nadava comigo quando era pequena. Leve os dois. O fragmento... e a memória dela.',
        effect: (S) => { S.give('fragmento_agua'); S.grantSchool('agua'); S.memory(2); },
        next: 'gift',
      },
      gift: {
        text: 'E aceite um presente meu, por gratidão. O que deseja?',
        choices: [
          { text: 'A Lágrima do Lago (amuleto de sabedoria).', effect: (S) => S.give('lagrima_lago'), next: 'bye' },
          { text: 'A Bênção da Maré (força vital permanente).', effect: (S) => { S.stats.attrs.vit += 1; S.stats.attrs.esp += 1; S.toast('Bênção da Maré: +1 Vitalidade, +1 Espírito', 'item'); }, next: 'bye' },
        ],
      },
      bye: { text: 'Vá. E quando encontrar a menina de luz, diga que o lago ainda guarda o lugar dela.', effect: (S) => S.q.advance('mq4a'), end: true },
    },
  },

  // ======================================================================
  // ZÉFIRO, O EREMITA
  // ======================================================================
  zefiro: {
    start(S) {
      if (S.q.atStage('sq_zefiro', 'return')) return 'done';
      if (S.q.atStage('sq_zefiro', 'trial')) return 'retry';
      if (!S.q.isStarted('sq_zefiro')) return 'meet';
      return 'idle';
    },
    nodes: {
      meet: {
        text: 'AH! Um visitante! Ou uma gaivota muito grande. Não, visitante. As gaivotas não usam botas. Bem-vind{o|a} à minha torre, que é torta de propósito, por motivos aerodinâmicos.',
        choices: [
          { text: 'Dizem que o senhor controla o vento.', next: 'meet2' },
          { text: 'A torre está torta porque está caindo.', next: 'meet_funny' },
        ],
      },
      meet_funny: { text: 'Calúnia! Ela está caindo em câmera lenta, há quarenta anos. É uma questão de perspectiva.', next: 'meet2' },
      meet2: {
        text: 'Controlo? Ninguém controla o vento, jovem. A gente conversa com ele, e às vezes ele concorda. Hm... você tem uma estrela na mão. E quer aprender o vento, imagino.',
        choices: [{ text: 'Quero.', next: 'meet3' }],
      },
      meet3: {
        text: 'Então prove que é rápid{o|a} como uma rajada! Vou espalhar oito cristais de vento ao redor da torre. Quebre todos antes que a areia da ampulheta caia. Noventa segundos! Pronto? Não importa, já comecei!',
        effect: (S) => S.start('sq_zefiro'),
        end: true,
      },
      retry: {
        text: 'O vento não espera os preguiçosos! Quer tentar de novo?',
        choices: [{ text: 'Sim, recomece o desafio.', effect: (S) => S.startWindTrial(true), end: true }, { text: 'Agora não.', end: true }],
      },
      done: {
        text: 'Magnífico! Você correu como um vendaval com dor de dente! O vento agora reconhece você. E... ah. Você me lembra alguém. Uma menininha de olhos de estrela que vinha aqui com o pai.',
        effect: (S) => S.grantSchool('vento'),
        next: 'done2',
      },
      done2: {
        text: 'Lyra. A filha de Vaelthor. Eu ensinei a ela uma canção para acalmar tempestades. Ela nunca aprendeu o fim... a mãe dela é que sabia. Tome, leve essa lembrança. Talvez ela precise mais de você do que de mim.',
        effect: (S) => { S.memory(4); S.q.advance('sq_zefiro'); S.codex('zefiro'); },
        end: true,
      },
      idle: { text: 'O vento está de bom humor hoje. Ou de mau humor. É difícil saber, ele é muito sarcástico.', end: true },
    },
  },

  // ======================================================================
  // TICO, O RABISCO
  // ======================================================================
  tico: {
    start(S) {
      if (S.q.atStage('sq_tico', 'return')) return 'colors_done';
      if (S.flags.ticoColorful) return 'happy';
      if (S.q.isActive('sq_tico')) return 'remind';
      return 'meet';
    },
    nodes: {
      meet: {
        text: 'BOING! Ah! Um humano! Não me machuca, por favor! Eu sou bonzinho! Eu sou o Tico! Eu fugi lá da Fenda porque os outros Rabiscos só queriam bater em gente, e eu só queria cheirar flor.',
        effect: (S) => S.codex('tico'),
        choices: [{ text: 'Calma, Tico. Não vou te machucar.', next: 'meet2' }, { text: 'Um Rabisco amigável? Isso é novo.', next: 'meet2' }],
      },
      meet2: {
        text: 'Mas aí... *funga* os três Rabiscos malvados roubaram minhas cores! O Vermelho, o Amarelo e o Azul! Sem cor eu vou ficando apagadinho, apagadinho, até virar rascunho! E rascunho a gente joga fora!',
        choices: [
          { text: 'Vou recuperar suas cores, Tico.', effect: (S) => { S.start('sq_tico'); S.karma(3); }, next: 'meet3' },
          { text: 'Desculpe, Tico, tenho coisas mais importantes.', next: 'meet_no' },
        ],
      },
      meet3: { text: 'VIVA! *ele dá três piruetas.* O Rabisco Carmim fugiu pra clareira dos cogumelos gigantes, no sul da floresta. O Dourado foi pros girassóis, além do rio. E o Anil foi molhar os pés no lago grandão, lá no norte dele!', end: true },
      meet_no: { text: '*Tico fica cinza-escuro e senta no chão.* Tudo bem... Eu entendo... *funga*', end: true },
      remind: { text: 'Carmim nos cogumelos! Dourado nos girassóis! Anil no norte do lago! Vai, vai, vai!', end: true },
      colors_done: {
        text: 'MINHAS CORES! *Tico mergulha nos potes de tinta e sai girando, colorido como um arco-íris.* EU TÔ LINDO! EU TÔ VIVO! EU TÔ... um pouco amarelo demais, mas tudo bem!',
        effect: (S) => { S.take('tinta_vermelha'); S.take('tinta_amarela'); S.take('tinta_azul'); },
        next: 'colors_done2',
      },
      colors_done2: {
        text: 'Você foi tão legal comigo que eu vou te dar um presente de Rabisco! Um pouquinho da mágica de desenho! Agora você também pode fazer coisas cartunescas de verdade! Tipo BIGORNAS! E fica com meu pincel também. Vai que você precisa desenhar uma porta um dia!',
        effect: (S) => { S.grantSchool('toon'); S.give('pincel_tico'); S.set('ticoColorful'); S.q.advance('sq_tico'); S.codex('rabiscos'); },
        end: true,
      },
      happy: { text: 'Olha só, eu desenhei um cachorro! *O cachorro desenhado late "AU" com letras de verdade e sai correndo.* Ops.', end: true },
    },
  },

  // ======================================================================
  // PEDRA NEGRA
  // ======================================================================
  pedra_negra: {
    start(S) {
      if (S.flags.shadowPact === 'accepted') return 'after_accept';
      if (S.flags.shadowPact === 'destroyed') return null;
      return S.flags.stoneMet ? 'again' : 'first';
    },
    nodes: {
      first: {
        speaker: 'Pedra Negra',
        text: '...ssss... ah... uma estrela que caminha... Chegue mais perto, pequen{o|a} portador{|a}. Sinto o cheiro do seu medo. Do Coração partido. Da menina que chama no escuro...',
        effect: (S) => { S.set('stoneMet'); S.codex('pedra_negra'); if (!S.q.isStarted('sq_pedra')) S.start('sq_pedra'); },
        next: 'offer',
      },
      again: { speaker: 'Pedra Negra', text: 'Voltou... Eu sabia que voltaria. Todos voltam. A oferta continua de pé...', next: 'offer' },
      offer: {
        speaker: 'Pedra Negra',
        text: 'Fogo, água, luz... brinquedos de criança. Eu ofereço a sombra. O passo que atravessa paredes. A fome que bebe a vida dos inimigos. E o preço é tão pequeno... só um pouquinho da sua luz.',
        choices: [
          { text: 'Aceito o pacto.', next: 'accept', karmaHint: -25 },
          { text: 'Não. Fique com a sua sombra.', next: 'refuse' },
          { text: '[Luz] Eu vou destruir você.', req: { school: 'luz', schoolName: 'Luz' }, next: 'destroy' },
          { text: 'Vou pensar.', end: true },
        ],
      },
      accept: {
        speaker: 'Pedra Negra',
        text: '...ssssim. *Uma fumaça negra sobe pelos seus braços e entra pela marca. Por um instante, você não sente nada. Depois, sente tudo.* Ah, como você é delicios{o|a}. Nós nos veremos de novo, portador{|a}. Sempre.',
        effect: (S) => { S.set('shadowPact', 'accepted'); S.set('shadowPactFinal'); S.karma(-25); S.grantSchool('sombra'); S.give('lamina_sombria'); S.q.complete('sq_pedra'); S.record('Aceitou o pacto da Pedra Negra'); },
        end: true,
      },
      refuse: { speaker: 'Pedra Negra', text: 'Hahaha... ninguém recusa para sempre. Quando a menina gritar e você não for forte o bastante, lembre-se de mim.', effect: (S) => { if (!S.flags.stoneRefused) { S.karma(5); S.set('stoneRefused'); } }, end: true },
      destroy: {
        speaker: 'Pedra Negra',
        text: 'Destruir? A MIM? Eu sou o medo que vive no fundo de cada sonho! *A pedra estremece e três sombras com olhos violeta se arrancam do chão.*',
        effect: (S) => { S.set('shadowPactFinal'); S.q.advance('sq_pedra', 'destroy'); },
        end: true,
      },
      after_accept: { speaker: 'Pedra Negra', text: 'Sua sombra está faminta hoje... ssss... alimente-a.', end: true },
    },
  },

  // ======================================================================
  // DIÁRIO DO REI
  // ======================================================================
  diario: {
    start: () => 'p1',
    nodes: {
      p1: { speaker: 'Diário do Rei Aldren', text: '"Os curandeiros dizem que tenho um ano. Um ano! Depois de tudo que construí. Depois de tudo que dei a este reino ingrato."', next: 'p2' },
      p2: { speaker: 'Diário do Rei Aldren', text: '"Vaelthor se recusa. Diz que o Sonhar não devolve o que leva. Covarde. A filha dele é uma Sonhadora — ela poderia trazer de lá a juventude, a cura, a eternidade."', next: 'p3' },
      p3: { speaker: 'Diário do Rei Aldren', text: '"Esta noite, durante o eclipse, faremos o ritual na torre do Coração. Vaelthor não precisa saber. A menina é forte. Ela vai sobreviver. Ela precisa sobreviver."', next: 'p4' },
      p4: { speaker: 'narrador', text: 'A última página está manchada de tinta violeta, como se algo tivesse explodido sobre ela. Agora você entende: o Eclipse não foi um acidente. E Vaelthor não foi o primeiro a cometer um crime.', effect: (S) => { S.set('readDiary'); S.give('diario_rei'); S.codex('diario'); S.event('interact', { id: 'diario_rei' }); S.removeInteractable('diario_rei'); }, end: true },
    },
  },

  jaula: {
    start: () => 'start',
    nodes: {
      start: {
        speaker: 'narrador',
        text: 'Uma jaula de madeira reforçada com ferro. O cadeado é grande e enferrujado. Tomás olha para você com esperança.',
        choices: [
          { text: 'Usar a Chave da Jaula.', req: { item: 'chave_cela' }, effect: (S) => S.freeTomas('chave'), end: true },
          { text: '[Força 7] Arrebentar o cadeado.', req: { attr: 'for', min: 7 }, effect: (S) => S.freeTomas('forca'), end: true },
          { text: '[Destreza 6] Abrir o cadeado com um grampo.', req: { attr: 'des', min: 6 }, effect: (S) => S.freeTomas('destreza'), end: true },
          { text: 'Deixar para depois.', end: true },
        ],
      },
    },
  },

  quadro: {
    start: () => 'start',
    nodes: {
      start: {
        speaker: 'Quadro de Avisos',
        text: (S) => {
          const l = ['PROCURA-SE: alguém corajoso para investigar choro no moinho. Falar com Osmar.', 'RECOMPENSA: caçador Gareth paga bem pela cabeça (ou presa) de um lobo branco gigante.', 'PERDIDAS: três ovelhas. Respondem por Branquinha, Fuligem e Dona Bolota. Falar com Dona Marta.', 'A capela precisa de Flores-da-Lua. Irmã Celeste agradece.', 'AVISO DA GUARDA: evitem o cemitério à noite.'];
          return l.join('\n');
        },
        end: true,
      },
    },
  },

  // ======================================================================
  // SIR PIMPOLHO
  // ======================================================================
  pimpolho_derrota: {
    start: () => 'start',
    nodes: {
      start: {
        speaker: 'Sir Pimpolho',
        text: '*O gigante de tinta senta no chão, derramando lágrimas pretas.* Chega, chega, não aguento mais apanhar... Eu só guardava o quarto da princesinha... Ela me desenhou grandão... pra ninguém mais machucar ela...',
        choices: [
          { text: 'Pimpolho... você era o bobo da corte de Lyra?', next: 'who' },
        ],
      },
      who: {
        speaker: 'Sir Pimpolho',
        text: 'Eu fazia ela rir quando ela tinha febre... Malabares, cambalhotas, a galinha! Ela ria tanto! Aí veio o eclipse e ela sumiu, e eu acordei assim, enorme e de tinta. Eu tenho que guardar o castelo pra quando ela voltar...',
        effect: (S) => S.codex('pimpolho'),
        choices: [
          { text: 'Lyra pode voltar. Me ajude a trazê-la.', next: 'spare', karmaHint: 10 },
          { text: 'Você é só um pesadelo de tinta. Acabou.', next: 'destroy', karmaHint: -10 },
        ],
      },
      spare: {
        speaker: 'Sir Pimpolho',
        text: '*Ele encolhe, encolhe, até ficar do tamanho de um homem — um bobo da corte de carne, osso e chapéu de guizos.* Eu... voltei? EU VOLTEI! Rimas, malabares e galinhas, prometo ajudar com todas as minhas... é... coisinhas! Tome, isso caiu do meu chapéu: um riso da princesinha.',
        effect: (S) => { S.set('pimpolhoFate', 'spared'); S.karma(10); S.memory(3); S.record('Poupou Sir Pimpolho'); S.pimpolhoAftermath(); },
        end: true,
      },
      destroy: {
        speaker: 'Sir Pimpolho',
        text: '*Ele olha para você com olhos enormes.* Ah... tá bom... *e se desfaz numa poça de tinta.* De dentro dela, uma pequena borboleta de luz voa até você.',
        effect: (S) => { S.set('pimpolhoFate', 'destroyed'); S.karma(-10); S.xp(200); S.memory(3); S.record('Destruiu Sir Pimpolho'); S.pimpolhoAftermath(); },
        end: true,
      },
    },
  },

  pimpolho_npc: {
    start: () => 'start',
    nodes: {
      start: { text: (S) => (S.flags.riftOpen ? 'Lá na Fenda a princesinha espera, vai com coragem, não desespera! Hã? Rimou! Eu sou bom nisso.' : 'Um, dois, três, quatro, eu vou ajudar, é fato!'), end: true },
    },
  },

  // ======================================================================
  // LYRA (visão no templo)
  // ======================================================================
  lyra_templo: {
    start: () => 'v1',
    nodes: {
      v1: { speaker: 'Lyra', text: 'Você me ouve? Agora consegue me ver também! Eu tentei falar com você tantas vezes... a luz do templo me ajudou a chegar mais perto.', next: 'v2' },
      v2: {
        speaker: 'Lyra',
        text: 'Meu nome é Lyra. Meu pai é Vaelthor, o Arquimago. Eu estou presa no Sonhar desde a noite do eclipse. Tem tinta e estrelas pra todo lado, e às vezes os pesadelos chegam perto...',
        effect: (S) => S.codex('lyra'),
        choices: [
          { text: 'Como você foi parar aí?', next: 'v3' },
          { text: 'Seu pai partiu o Coração. Ele é o vilão?', next: 'v3b' },
        ],
      },
      v3: { speaker: 'Lyra', text: 'Eu não lembro direito. Tinha soldados. E o rei. E muita luz... Depois eu caí. Papai está tentando me buscar, mas ele está fazendo do jeito errado.', next: 'v4' },
      v3b: { speaker: 'Lyra', text: 'Ele não é mau! Ele só... está muito triste. E com muita raiva. Ele está tentando me buscar, mas do jeito errado.', next: 'v4' },
      v4: {
        speaker: 'Lyra',
        text: 'Ele quer rasgar o Véu inteiro pra abrir um caminho até mim. Mas se o Véu cair, o Sonhar vai engolir tudo — você, a vila, o mundo... e eu também. Por favor, impeça ele. Mas não machuque ele... se der.',
        next: 'v5',
      },
      v5: {
        speaker: 'Lyra',
        text: 'Toma. Aqui no Sonhar tudo é pensamento, e eu aprendi a mover coisas com a mente. Leve um pouquinho disso com você. E leve também esta lembrança. Tem mais delas espalhadas por aí, como borboletas... se você juntar todas, talvez encontre o caminho até mim.',
        effect: (S) => { S.grantSchool('psiquico'); S.memory(1); },
        next: 'v6',
      },
      v6: { speaker: 'Lyra', text: 'Estão me chamando... os pesadelos. Eu tenho que ir. Não esquece de mim, {nome}!', effect: (S) => S.endTempleVision(), end: true },
    },
  },

  // ======================================================================
  // VAELTHOR — CONFRONTO
  // ======================================================================
  vaelthor_npc: {
    start: () => 'v1',
    nodes: {
      v1: {
        speaker: 'Vaelthor',
        text: 'Então este é o fragmento que me faltava. Andando, falando, carregando os pedaços do meu Coração como bugigangas no bolso. Você veio de muito longe para morrer, criança.',
        choices: [
          { text: 'Eu vim impedir você de rasgar o Véu.', next: 'v2' },
          { text: 'Eu sei o que o rei fez com Lyra.', cond: (S) => S.flags.readDiary, next: 'v2_king' },
        ],
      },
      v2_king: {
        speaker: 'Vaelthor',
        text: '*Pela primeira vez, ele hesita.* ...Você leu. Então sabe. Aquele velho imundo arrastou minha filha para a torre enquanto eu dormia. Quando cheguei, ela já... *a voz quebra.* Eu o enviei para o Sonhar. Que os pesadelos se divirtam com ele.',
        effect: (S) => S.set('vaelthorKnows'),
        next: 'v2',
      },
      v2: {
        speaker: 'Vaelthor',
        text: 'Durante um ano procurei Lyra pelas bordas do Sonhar. Ouço a voz dela, mas não consigo alcançá-la. O Véu é forte demais. Então eu vou derrubá-lo. Inteiro. E minha filha volta para casa.',
        choices: [
          { text: 'Se o Véu cair, o Sonhar engole o mundo — e Lyra junto.', next: 'v3' },
          { text: '[Espírito 8] Lyra falou comigo. Ela não quer que você faça isso.', req: { attr: 'esp', min: 8 }, next: 'v3_spirit' },
          { text: '[Inteligência 8] Seus cálculos estão errados. O Sonhar não tem chão — Lyra cairia para sempre.', req: { attr: 'int', min: 8 }, next: 'v3_spirit' },
        ],
      },
      v3_spirit: {
        speaker: 'Vaelthor',
        text: '*O cajado treme em sua mão.* Mentira. Mentira! Ela... ela fala com você? Com VOCÊ, e não comigo? *Ele cambaleia. A Fenda pulsa, instável.* Não... não importa. Não importa!',
        effect: (S) => { S.set('vaelthorWavered'); S.xp(150); },
        next: 'offer',
      },
      v3: { speaker: 'Vaelthor', text: 'Riscos que aceito de bom grado. Um mundo sem ela já é um pesadelo.', next: 'offer' },
      offer: {
        speaker: 'Vaelthor',
        text: 'Mas eu não sou um monstro. Ajude-me. Com a sua marca, o Véu cai em instantes, sem dor. Os sonhos se tornam reais. Os mortos podem voltar. Minha filha volta. Pense no que você ganharia, criança. Junte-se a mim.',
        choices: [
          { text: 'Aceito. Vamos derrubar o Véu juntos.', next: 'join_confirm', karmaHint: 0 },
          { text: 'Não. Isso acaba agora.', next: 'fight' },
        ],
      },
      join_confirm: {
        speaker: 'narrador',
        text: 'Esta escolha levará a um dos finais do jogo. Tem certeza?',
        choices: [
          { text: 'Sim. Junte-se a Vaelthor.', effect: (S) => S.ending('grande_sonho'), end: true },
          { text: 'Não, espere...', next: 'offer' },
        ],
      },
      fight: {
        speaker: 'Vaelthor',
        text: (S) => (S.flags.vaelthorWavered ? 'Então que seja. Mesmo que eu tenha que passar por você... e por mim mesmo.' : 'Que pena. Você teria sido um aprendiz excelente. VENHA, PORTADOR{|A}!'),
        effect: (S) => { S.set('vaelthorFight'); S.q.advance('mq6'); },
        end: true,
      },
    },
  },

  // ======================================================================
  // ESCOLHA FINAL
  // ======================================================================
  final_escolha: {
    start: () => 'v1',
    nodes: {
      v1: {
        speaker: 'Vaelthor',
        text: '*Vaelthor está de joelhos. O núcleo do Coração de Aether flutua acima da arena, pulsando como um coração de verdade.* ...Acabou. Você venceu. Faça o que tiver que fazer. Só... não deixe minha filha sozinha lá.',
        next: 'v2',
      },
      v2: {
        speaker: 'narrador',
        text: 'Os fragmentos na sua marca cantam em uníssono. O Coração espera. Esta é a escolha que decidirá o destino de Valdren.',
        choices: [
          { text: 'Cantar a canção de ninar de Lyra.', req: { item: 'coracao_lyra' }, cond: (S) => true, tag: '[Canção de Ninar]', next: 'confirm_despertar' },
          { text: 'Pegar o pincel de Tico e desenhar uma porta para o Sonhar.', cond: (S) => S.hasSchool('toon') && S.flags.pimpolhoFate === 'spared' && S.has('pincel_tico'), tag: '[Toon]', next: 'confirm_toon' },
          { text: 'Fundir-me ao Coração e trocar de lugar com Lyra.', req: { karma: 25 }, next: 'confirm_chama' },
          { text: 'Destruir Vaelthor e restaurar o Coração.', next: 'confirm_guardiao' },
          { text: 'Absorver todo o poder do Coração para mim.', next: 'confirm_coroa' },
        ],
      },
      confirm_despertar: { speaker: 'narrador', text: 'Você fecha os olhos e procura a melodia nas memórias de Lyra...', effect: (S) => S.ending('despertar'), end: true },
      confirm_toon: { speaker: 'narrador', text: 'Você tira do bolso o pincel de Tico. Ele ainda está molhado de tinta.', effect: (S) => S.ending('isso_e_tudo'), end: true },
      confirm_chama: { speaker: 'narrador', text: 'Você coloca a mão marcada sobre o núcleo do Coração...', effect: (S) => S.ending('ultima_chama'), end: true },
      confirm_guardiao: { speaker: 'narrador', text: 'Você ergue a espada uma última vez.', effect: (S) => S.ending('guardiao'), end: true },
      confirm_coroa: {
        speaker: (S) => (S.flags.shadowPact === 'accepted' ? 'Sua Sombra' : 'narrador'),
        text: (S) => (S.flags.shadowPact === 'accepted' ? '...sssim... pegue tudo... você merece... nós merecemos...' : 'O poder chama. É só estender a mão.'),
        choices: [{ text: 'Estender a mão.', effect: (S) => S.ending('coroa_cinzas'), end: true }, { text: 'Não... ainda não.', next: 'v2' }],
      },
    },
  },
};
