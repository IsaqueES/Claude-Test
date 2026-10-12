// História, crônicas (códex), memórias de Lyra e finais.

export const INTRO_PAGES = [
  { text: 'Por mil anos, o Coração de Aether brilhou no alto da Torre de Valdren, sustentando o Véu — a fronteira entre o mundo desperto e o Sonhar, o reino onde vivem os sonhos, os medos e as ideias de todas as criaturas.' },
  { text: 'Há um ano, na Noite do Eclipse, o Coração se partiu. Ao norte do castelo, o céu se rasgou numa ferida violeta: a Fenda. E por ela, o Sonhar começou a vazar sobre o mundo.' },
  { text: 'Pesadelos ganharam garras. Rabiscos de tinta ganharam vida. O Rei Aldren desapareceu. E o Arquimago Vaelthor, guardião do Coração, foi visto pela última vez caminhando para dentro da luz.' },
  { text: 'Naquela mesma noite, na pequena vila de Brumavale, um fragmento do Coração caiu do céu como uma estrela cadente... e encontrou você.' },
  { text: '...você consegue me ouvir?', voice: true, time: 3.2 },
  { text: 'Por favor... ele não vai parar. Encontre os pedaços... antes que ele rasgue tudo.', voice: true, time: 4.5 },
  { text: 'Meu nome é—', voice: true, time: 2.2 },
  { text: 'Brumavale. Um ano depois.', time: 3 },
];

export const LULLABY = 'Dorme, estrela, que o vento já vem,\nleva teus medos pra longe de alguém.\nSe o escuro chamar, não precisa temer:\nquem te ama acende a luz pra você.';

export const CODEX = {
  coracao: { title: 'O Coração de Aether', text: 'Um cristal do tamanho de uma criança, nascido quando o mundo ainda era sonho. O Coração mantinha o Véu esticado entre o mundo desperto e o Sonhar, como a pele de um tambor.\n\nCada um de seus fragmentos guarda a memória de um elemento: fogo, água, terra, luz. Juntos, cantavam. Separados, choram.' },
  veu: { title: 'O Véu e o Sonhar', text: 'O Sonhar é o lugar para onde vão os pensamentos quando ninguém está olhando: sonhos de crianças, medos de soldados, ideias que ainda não nasceram. Lá, a mente é a única lei.\n\nO Véu impede que as coisas de lá atravessem para cá — e que as daqui se percam lá. Pelo menos impedia.' },
  fenda: { title: 'A Fenda', text: 'Uma rachadura de luz violeta que corta o céu ao norte do Castelo de Valdren. Ao redor dela, o chão apodreceu em cristal e as pedras esqueceram como cair.\n\nDizem que quem olha muito tempo para a Fenda começa a sonhar acordado.' },
  ecos: { title: 'Ecos', text: 'Pesadelos que atravessaram o Véu. Não têm carne, apenas fome e medo. A luz os fere profundamente; o fogo também. Espadas comuns parecem atravessar fumaça.' },
  rabiscos: { title: 'Rabiscos', text: 'Criaturas de tinta com olhos enormes e sorrisos tortos. Ninguém sabe por que o Sonhar cospe desenhos animados — mas eles batem com força, quicam com mais força ainda e se desmancham quando molhados.\n\nAs crianças de Brumavale juram que alguns são simpáticos.' },
  marca: { title: 'A Marca de Aether', text: 'A cicatriz em forma de estrela na sua palma. Um fragmento do Coração se fundiu à sua carne na Noite do Eclipse. Ela esquenta perto de magia antiga e permite absorver essências — algo que nenhum mago jamais conseguiu.' },
  brumavale: { title: 'Brumavale', text: 'Uma vila de agricultores e ferreiros no vale das névoas. Famosa pela torta de maçã de Rosalina, pelas espadas de Bram e por absolutamente mais nada — até agora.' },
  vaelthor: { title: 'O Arquimago Vaelthor', text: 'Guardião do Coração por trinta anos. Viúvo. Pai de uma menina chamada Lyra. Ensinou metade dos magos do reino e sorria pouco. Na Noite do Eclipse, o Coração se partiu em suas mãos.' },
  aldren: { title: 'Rei Aldren III', text: 'O rei que prometeu que Valdren jamais conheceria a fome. Envelheceu temendo a morte mais do que temia qualquer inimigo. Desapareceu na Noite do Eclipse.' },
  lyra: { title: 'Lyra', text: 'Filha de Vaelthor. Uma Sonhadora: alguém capaz de caminhar entre o mundo desperto e o Sonhar. Desde a Noite do Eclipse, dorme num sono do qual não acorda — e sua voz chama você.' },
  corvo: { title: 'O Corvo', text: 'Ex-sargento da Guarda Real que desertou quando o rei sumiu e os nobres fugiram. Hoje lidera um bando de foras da lei na Floresta dos Sussurros. Rouba dos ricos — e, ultimamente, de quem estiver por perto.' },
  guarda: { title: 'A Guarda Real', text: 'O que restou do exército de Valdren: algumas dezenas de soldados acampados ao sul do castelo, sob o comando da Capitã Isolde, que se recusa a abandonar o posto.' },
  espirito_lago: { title: 'Ondina, o Espírito do Lago', text: 'O Lago Espelhado reflete não o céu, mas o Sonhar. Seu espírito é antigo, gentil e um pouco vaidoso. Ele guardou o Fragmento da Água desde a Noite do Eclipse.' },
  colosso: { title: 'O Colosso de Pedra', text: 'Um guardião esculpido pelos primeiros reis para proteger a montanha. Quando o Fragmento da Terra caiu na cratera, o Colosso despertou — e esqueceu quem eram os amigos.' },
  pimpolho: { title: 'Sir Pimpolho', text: 'Bobo da corte de Valdren, o único capaz de fazer a pequena Lyra rir quando ela adoecia. Na Noite do Eclipse, os sonhos de Lyra o transformaram num gigante de tinta encarregado de guardar o castelo — o "quarto de brinquedos" dela.' },
  pedra_negra: { title: 'A Pedra Negra', text: 'Um monólito que surgiu no cemitério de Brumavale depois do Eclipse. À noite, sussurra promessas. Ninguém que aceitou uma delas voltou a dormir em paz.' },
  tico: { title: 'Tico', text: 'Um Rabisco que fugiu da Fenda e decidiu que não queria bater em ninguém. Gosta de flores, de crianças e de fazer barulhos com a boca. Perdeu suas cores.' },
  zefiro: { title: 'Zéfiro, o Eremita', text: 'Mago do vento, antigo professor da corte, expulso por "excesso de entusiasmo com tempestades". Mora numa torre torta e conversa com gaivotas que não existem.' },
  m1: { title: 'Memória: A Primeira Luz', text: 'Um jardim de verão no castelo. Uma menina de seis anos tenta segurar um raio de sol com as mãos. O pai ri — um riso raro — e faz a luz dançar entre os dedos dela.\n\n"Papai, por que a luz existe?"\n"É o jeito de o mundo dizer: estou aqui."' },
  m2: { title: 'Memória: O Lago dos Sonhos', text: 'Lyra sonha que nada no Lago Espelhado ao lado de um espírito feito de água. Quando acorda, seus cabelos estão molhados.\n\nFoi a primeira vez que ela entendeu: era uma Sonhadora. Podia caminhar pelo Sonhar e voltar.' },
  m3: { title: 'Memória: O Riso do Bobo', text: 'Febre, cobertores, uma vela. Pimpolho entra tropeçando de propósito, fazendo malabarismo com três maçãs e uma galinha indignada. Lyra ri até tossir.\n\nDepois, ela o desenha como um cavaleiro gigante de tinta. "Quando eu desenho, as coisas ficam corajosas."' },
  m4: { title: 'Memória: A Canção do Vento', text: 'No alto de uma torre torta, um velho de barba branca ensina uma menina a acalmar uma tempestade cantando.\n\n"Dorme, estrela, que o vento já vem..."\n"E depois, mestre Zéfiro?"\n"O resto, minha flor, quem sabe é a sua mãe."' },
  m5: { title: 'Memória: A Noite do Eclipse', text: 'Soldados do rei arrastando Lyra até a torre do Coração. O rei, velho e trêmulo, querendo a vida eterna que ela poderia buscar no Sonhar. O ritual dá errado: a alma de Lyra se perde do outro lado.\n\nVaelthor arromba a porta tarde demais. Em fúria e luto, ele parte o Coração para abrir um caminho até a filha.\n\nNo último instante antes de se perder, Lyra se lembra da voz da mãe cantando o fim da canção:\n\n"Se o escuro chamar, não precisa temer:\nquem te ama acende a luz pra você."' },
  cancao: { title: 'A Canção de Ninar de Lyra', text: 'Dorme, estrela, que o vento já vem,\nleva teus medos pra longe de alguém.\nSe o escuro chamar, não precisa temer:\nquem te ama acende a luz pra você.\n\nCom esta canção, talvez uma alma perdida encontre o caminho de casa.' },
  diario: { title: 'Diário do Rei Aldren (trechos)', text: '"Os curandeiros dizem que tenho um ano. Um ano! Depois de tudo que construí."\n\n"Vaelthor se recusa. Diz que o Sonhar não devolve o que leva. Covarde. Sua filha é uma Sonhadora — ela poderia trazer de lá a juventude, a cura, a eternidade."\n\n"Esta noite, durante o eclipse, faremos o ritual. Vaelthor não precisa saber. A menina é forte. Ela vai sobreviver. Ela precisa sobreviver."\n\nA última página está manchada de tinta violeta.' },
};

export const MEMORY_IDS = ['m1', 'm2', 'm3', 'm4', 'm5'];

// ---------------------------------------------------------------------------
// FINAIS
// ---------------------------------------------------------------------------
export const ENDINGS = {
  despertar: {
    index: 1, title: 'O Despertar de Lyra', style: 'light', mood: 'ending',
    slides: [
      { head: 'A Canção', text: 'Você fecha os olhos e canta. A marca em sua mão arde como uma pequena estrela.\n\n"Dorme, estrela, que o vento já vem..."\n\nVaelthor ergue a cabeça. Seus lábios tremem. E, pela primeira vez em um ano, ele canta junto.' },
      { head: 'Do outro lado', text: 'No fundo do Sonhar, uma menina perdida ouve duas vozes que conhece. Ela segue a canção como quem segue uma trilha de pão no escuro — até encontrar a luz da sua marca.\n\nQuando Lyra abre os olhos no mundo desperto, a primeira coisa que vê é o pai chorando. A segunda é você.' },
      { head: 'O Véu restaurado', text: 'Juntos, pai, filha e {o|a} Portador{|a} da Estrela reúnem os fragmentos. O Coração de Aether se reconstrói — agora com um brilho novo, morno, quase humano. A Fenda se fecha como um olho que finalmente pode dormir.' },
      { head: 'Justiça', text: 'Vaelthor se entrega ao conselho do reino e conta toda a verdade sobre o Rei Aldren. É condenado a reconstruir, pedra por pedra, as vilas que a Fenda feriu. Ele aceita sorrindo. Lyra o visita todos os dias.' },
    ],
  },
  guardiao: {
    index: 2, title: 'O Guardião do Véu', style: 'neutral', mood: 'ending',
    slides: [
      { head: 'O Último Golpe', text: 'Vaelthor cai. Por um instante, seu rosto fica em paz. "Diga a ela... que eu tentei."\n\nO Coração, livre de seu mestre, flutua até você.' },
      { head: 'O Véu restaurado', text: 'Com os fragmentos reunidos, o Coração de Aether volta a pulsar. A Fenda se fecha em silêncio. Os Ecos se desfazem como névoa ao sol.\n\nEm algum lugar muito longe, uma voz infantil sussurra "obrigada" — e se apaga para sempre no Sonhar.' },
      { head: 'Guardião', text: '{nome} se torna Guardi{ão|ã} do Coração, morando na torre que um dia foi de Vaelthor. O reino prospera. As crianças cantam canções sobre {o|a} herói{|na} da estrela.\n\nMas, em algumas noites, você sonha com uma menina de luz que nunca chegou a conhecer.' },
    ],
  },
  ultima_chama: {
    index: 3, title: 'A Última Chama', style: 'light', mood: 'ending',
    slides: [
      { head: 'A Escolha', text: 'Você entende o que precisa ser feito. Uma alma está presa do outro lado do Véu — e o Véu precisa de um coração.\n\nVocê coloca a mão marcada sobre o núcleo do Coração de Aether. "Troque comigo."' },
      { head: 'Do outro lado', text: 'Seu corpo se desfaz em luz. No Sonhar, você encontra Lyra encolhida num mar de tinta e estrelas. Você segura a mão dela e a empurra de volta para casa.\n\nEla acorda nos braços do pai. Você fica.' },
      { head: 'O Coração que canta', text: 'O novo Coração de Aether brilha com uma luz que nenhum cristal jamais teve: a sua. O Véu se fecha, firme como nunca.\n\nVaelthor dedica o resto da vida a proteger o Coração. Lyra conversa com ele todas as noites. Às vezes, ele responde.' },
    ],
  },
  coroa_cinzas: {
    index: 4, title: 'A Coroa de Cinzas', style: 'dark', mood: 'dark',
    slides: [
      { head: 'Poder', text: 'Você estende a mão para o Coração de Aether. Ele resiste — e então cede.\n\nO poder de todos os elementos, de todos os sonhos e de todos os medos flui para dentro de você. É frio. É maravilhoso.' },
      { head: 'Ordem', text: 'A Fenda se fecha com um gesto seu. Os Ecos se ajoelham. Vaelthor é lançado ao Sonhar para nunca mais voltar, e com ele a última esperança de Lyra.\n\nO reino aclama {o|a} salvador{|a}. E {o|a} salvador{|a} aceita a coroa.' },
      { head: 'O Soberano Eterno', text: 'Valdren nunca mais conhece guerra, fome ou Ecos. Também nunca mais conhece canções proibidas, reuniões noturnas ou portas trancadas.\n\nSeus olhos brilham violeta. Você não dorme há cem anos. Às vezes, ouve um choro de criança — e manda que fechem as janelas.' },
    ],
  },
  grande_sonho: {
    index: 5, title: 'O Grande Sonho', style: 'rift', mood: 'rift',
    slides: [
      { head: 'Aliança', text: 'Você aceita. Vaelthor sorri — um sorriso cansado, quase gentil. Juntos, você e o Arquimago colocam as mãos sobre o núcleo do Coração.\n\nO Véu não se rasga. Ele simplesmente... deixa de existir.' },
      { head: 'O mundo sonhado', text: 'O Sonhar se derrama sobre Valdren como maré. Rios correm para cima. Dragões de papel cruzam o céu. Pesadelos e maravilhas caminham lado a lado pelas estradas.\n\nLyra acorda — e o mundo inteiro acorda dentro do sonho dela.' },
      { head: 'Depois', text: 'Ninguém sabe dizer se o que veio depois foi um paraíso ou um pesadelo. Talvez as duas coisas. Brumavale agora flutua sobre as nuvens nas terças-feiras.\n\nVaelthor e Lyra vivem numa torre de vidro que muda de forma conforme o humor dela. Você é sempre convidad{o|a} para o chá.' },
    ],
  },
  isso_e_tudo: {
    index: 6, title: 'Isso é Tudo, Pessoal!', style: 'toon', mood: 'toon',
    slides: [
      { head: 'Um Plano Ridículo', text: 'Você tira do bolso o pincel de Tico. Vaelthor franze a testa. "O que você pensa que está fazendo?"\n\nVocê desenha uma porta no ar. Ela é torta. Tem uma maçaneta enorme. E um capacho escrito BEM-VINDO.' },
      { head: 'Toc, toc', text: 'A porta se abre com um "BOING". Do outro lado está o Sonhar — e, sentada num mar de tinta, Lyra, que ri ao ver o desenho horroroso.\n\n"Foi você que desenhou isso?" Ela atravessa a porta correndo e pula no colo do pai, que desmaia de emoção (com estrelinhas girando em volta da cabeça).' },
      { head: 'Física de Desenho Animado', text: 'Sem saber exatamente como, a Fenda é costurada com um zíper gigante. O Coração de Aether é colado com fita adesiva. Funciona perfeitamente.\n\nSir Pimpolho é nomeado Ministro da Alegria. Tico ganha um bigode. Vaelthor passa a usar um chapéu de festa e se recusa a tirá-lo.' },
      { head: 'Fim?', text: 'Desde então, de vez em quando, uma bigorna cai do céu em Valdren. Ninguém se machuca. Todo mundo ri.\n\nE, quando o sol se põe, o horizonte inteiro se fecha num círculo preto, como no fim de um desenho antigo.\n\n— Isso é tudo, pessoal!' },
    ],
  },
};

// Slides do epílogo: cada um decide se aparece e o texto, a partir do estado.
export function epilogueSlides(S, endingId) {
  const f = S.story.flags;
  const out = [];
  const dark = endingId === 'coroa_cinzas';
  // Brumavale e os bandidos
  if (f.corvoFate === 'ally' || f.corvoFate === 'respect') out.push({ head: 'O Corvo', text: dark ? 'O Corvo foi o primeiro a se rebelar contra o novo soberano. Seu bando ainda canta canções proibidas nas florestas, e a recompensa por sua cabeça cresce todo ano.' : 'O Corvo lutou ao seu lado até o fim. Com o reino reconstruído, ele trocou o capuz por um uniforme e assumiu o comando da Guarda da Floresta. Ainda rouba tortas da taverna, por puro hábito.' });
  else if (f.corvoFate === 'spared') out.push({ head: 'O Corvo', text: 'Poupado, o Corvo desapareceu nas estradas do sul. Dizem que hoje protege caravanas em vez de roubá-las — e que nunca esqueceu quem lhe deu uma segunda chance.' });
  else if (f.corvoFate === 'killed') out.push({ head: 'O Corvo', text: 'Sem seu líder, o bando do Corvo se dispersou em pequenos grupos sem honra. As estradas da floresta continuaram perigosas por muitos anos.' });
  else if (f.corvoFate === 'deal') out.push({ head: 'O Corvo', text: 'O Corvo cumpriu sua parte do acordo e sumiu com o ouro. Meses depois, uma carta anônima chegou a Brumavale com a metade das moedas e um bilhete: "Para o telhado da taverna."' });
  // Tomás
  if (S.q.isDone('sq_tomas')) out.push({ head: 'Bram e Tomás', text: 'Tomás voltou à forja do pai. Hoje as espadas de Brumavale levam duas marcas de ferreiro — e Bram jura que as do filho já são melhores que as dele (mas nunca na frente dele).' });
  else if (S.q.isStarted('sq_tomas')) out.push({ head: 'Bram', text: 'Bram nunca mais viu o filho. A forja de Brumavale continuou acesa, mas o martelo soava mais devagar.' });
  // Helena
  if (f.helenaFate === 'freed') out.push({ head: 'O Moinho', text: 'Com o anel de volta, o fantasma de Helena descansou em paz. Osmar plantou um jardim de flores-da-lua ao redor do moinho, e diz que, em certas noites, as pás giram sem vento.' });
  else if (f.helenaFate === 'banished') out.push({ head: 'O Moinho', text: 'O fantasma de Helena foi banido pela luz. O moinho voltou a ser só um moinho. Osmar envelheceu em silêncio, sem saber se fez a coisa certa.' });
  else if (f.helenaFate === 'betrayed') out.push({ head: 'O Moinho', text: 'O lamento de Helena nunca cessou. Osmar abandonou o moinho, e os viajantes evitam a estrada do sul nas noites sem lua. O anel continua brilhando, frio, no seu dedo.' });
  // Tico
  if (S.q.isDone('sq_tico')) out.push({ head: 'Tico', text: 'Tico, colorido e feliz, virou a atração principal das feiras de Brumavale. As crianças fazem fila para ganhar desenhos que, às vezes, saem andando sozinhos.' });
  // Pimpolho
  if (f.pimpolhoFate === 'spared') out.push({ head: 'Sir Pimpolho', text: endingId === 'isso_e_tudo' ? 'Sir Pimpolho, Ministro da Alegria, decretou feriado nacional às quartas-feiras.' : 'De volta ao tamanho normal, Sir Pimpolho reassumiu seu posto de bobo da corte. Seus números com galinhas indignadas são lendários.' });
  else if (f.pimpolhoFate === 'destroyed') out.push({ head: 'Sir Pimpolho', text: 'Do bobo da corte restou apenas uma mancha de tinta no chão do pátio, que nenhuma escova consegue limpar. Às vezes, ela parece sorrir.' });
  // Isolde
  if (f.isoldeDied) out.push({ head: 'Capitã Isolde', text: 'A Capitã Isolde morreu acreditando num rei que não merecia sua lealdade. Seu túmulo, no pátio do castelo, é o único que recebe flores todos os dias.' });
  else if (f.isoldeTruth === 'told') out.push({ head: 'Capitã Isolde', text: dark ? 'Isolde se recusou a servir ao novo soberano e foi exilada. Dizem que ela organiza a resistência no sul, um rei a menos para servir.' : 'Isolde se tornou Regente de Valdren. Seu primeiro decreto: nenhum governante jamais estará acima das leis do reino. O segundo: torta de maçã grátis no aniversário da Fenda fechada.' });
  else if (S.q.isStarted('mq5')) out.push({ head: 'Capitã Isolde', text: 'Isolde reconstruiu a Guarda Real em nome do Rei Aldren, jurando lealdade à memória de um herói que nunca existiu.' });
  // Pacto
  if (f.shadowPact === 'accepted') out.push({ head: 'A Pedra Negra', text: 'O pacto com a Pedra Negra nunca foi quebrado. Em algumas noites, sua sombra se move um segundo depois de você.' });
  else if (f.shadowPact === 'destroyed') out.push({ head: 'A Pedra Negra', text: 'No lugar da Pedra Negra, no cemitério de Brumavale, nasceu uma árvore de flores brancas que brilham ao amanhecer.' });
  // Gareth
  if (S.q.isDone('sq_presa')) out.push({ head: 'Gareth', text: 'Gareth, o caçador, finalmente dormiu uma noite inteira sem ouvir uivos. Ele ensinou as crianças da vila a seguir rastros — e a respeitar a floresta.' });
  // Celeste / Marta / Zéfiro
  if (S.q.isDone('sq_ovelhas')) out.push({ head: 'Dona Marta', text: 'As ovelhas de Dona Marta nunca mais fugiram. Bem, uma vez. Mas voltaram sozinhas.' });
  if (S.q.isDone('sq_zefiro')) out.push({ head: 'Zéfiro', text: 'Zéfiro voltou à corte como professor. Suas aulas de vento terminam, invariavelmente, com chapéus voando pela janela.' });
  // Karma
  if (S.story.karma >= 40 && !dark) out.push({ head: '{nome}', text: 'Em Brumavale, ergueram uma pequena estátua de {nome} perto do poço. Ela não se parece nada com você. Você adora mesmo assim.' });
  else if (S.story.karma <= -40 && !dark) out.push({ head: '{nome}', text: 'O reino foi salvo, mas as pessoas baixam a voz quando você passa. Herói ou ameaça — ninguém tem certeza.' });
  return out;
}
