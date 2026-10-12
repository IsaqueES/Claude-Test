// Catálogo de itens.
// type: weapon | armor | amulet | consumable | quest | material
export const ITEMS = {
  // ---------- Armas ----------
  espada_gasta: { name: 'Espada Gasta', type: 'weapon', dmg: 10, price: 15, desc: 'A velha espada do seu pai. Lâmina cega, mas fiel.' },
  espada_ferro: { name: 'Espada de Ferro', type: 'weapon', dmg: 15, price: 90, desc: 'Ferro bem temperado de Brumavale.' },
  lamina_bram: { name: 'Lâmina de Bram', type: 'weapon', dmg: 21, price: 260, bonus: { for: 1 }, desc: 'Forjada por Bram em agradecimento. Equilibrada como uma pena.' },
  presas_corvo: { name: 'Presas do Corvo', type: 'weapon', dmg: 18, price: 220, bonus: { des: 3 }, crit: 0.08, desc: 'Lâmina negra do líder dos bandidos. Golpes críticos frequentes.' },
  espada_valdren: { name: 'Espada Longa de Valdren', type: 'weapon', dmg: 27, price: 480, desc: 'Arma da guarda real, com o brasão do sol entalhado.' },
  lamina_aurora: { name: 'Lâmina da Aurora', type: 'weapon', dmg: 33, price: 900, element: 'light', bonus: { esp: 2 }, desc: 'Forjada na luz do Templo do Sol. Golpes causam dano de Luz.' },
  lamina_sombria: { name: 'Lâmina do Pacto', type: 'weapon', dmg: 30, price: 700, element: 'shadow', bonus: { esp: 3 }, desc: 'Presente da Pedra Negra. Sussurra quando corta.' },
  // ---------- Armaduras ----------
  tunica: { name: 'Túnica de Viajante', type: 'armor', def: 3, price: 10, desc: 'Lã simples e um bom cinto.' },
  couro: { name: 'Armadura de Couro', type: 'armor', def: 9, price: 110, desc: 'Couro fervido e reforçado.' },
  manto_lobo: { name: 'Manto da Presa-Branca', type: 'armor', def: 13, price: 300, bonus: { vit: 2 }, desc: 'Feito com a pele do lobo alfa. Quente e intimidador.' },
  cota_malha: { name: 'Cota de Malha', type: 'armor', def: 17, price: 340, desc: 'Milhares de anéis de aço entrelaçados.' },
  placas_valdren: { name: 'Armadura de Placas de Valdren', type: 'armor', def: 26, price: 800, bonus: { vit: 2 }, desc: 'Armadura cerimonial da guarda real, presente da Capitã Isolde.' },
  // ---------- Amuletos ----------
  amuleto_celeste: { name: 'Amuleto de Celeste', type: 'amulet', price: 160, bonus: { esp: 2 }, manaRegen: 1.0, desc: 'Abençoado na capela. Acalma a mente e renova a mana.' },
  lagrima_lago: { name: 'Lágrima do Lago', type: 'amulet', price: 200, bonus: { int: 2 }, mana: 25, desc: 'Uma gota cristalizada do Espírito do Lago.' },
  colar_presas: { name: 'Colar de Presas', type: 'amulet', price: 120, bonus: { for: 2 }, desc: 'Presas de lobo em um cordão de couro.' },
  insignia_corvo: { name: 'Insígnia do Corvo', type: 'amulet', price: 150, bonus: { des: 2, car: 1 }, desc: 'Prova de amizade com o bando do Corvo.' },
  anel_helena: { name: 'Anel de Helena', type: 'amulet', price: 250, bonus: { car: 3 }, desc: 'Um anel de casamento antigo. Brilha com uma luz fria e triste.' },
  pena_zefiro: { name: 'Pena de Zéfiro', type: 'amulet', price: 220, bonus: { des: 2, int: 1 }, desc: 'Leve como o vento dos picos.' },
  coracao_lyra: { name: 'Pingente de Lyra', type: 'amulet', price: 0, bonus: { esp: 3, car: 2 }, mana: 20, desc: 'Um pingente de estrela, quente ao toque. Ele lembra uma canção.' },
  // ---------- Consumíveis ----------
  pocao_vida: { name: 'Poção de Vida', type: 'consumable', price: 25, heal: 0.45, desc: 'Restaura 45% da vida máxima.' },
  pocao_mana: { name: 'Poção de Mana', type: 'consumable', price: 25, mana: 0.5, desc: 'Restaura 50% da mana máxima.' },
  elixir: { name: 'Elixir de Aether', type: 'consumable', price: 140, heal: 1, mana: 1, desc: 'Restaura completamente vida e mana.' },
  pao: { name: 'Pão de Rosalina', type: 'consumable', price: 6, healFlat: 30, desc: 'Ainda quentinho. Restaura 30 de vida.' },
  queijo: { name: 'Queijo da Marta', type: 'consumable', price: 10, healFlat: 55, desc: 'Curado por sete luas. Restaura 55 de vida.' },
  tonico_vigor: { name: 'Tônico de Vigor', type: 'consumable', price: 40, buff: 'haste', desc: 'Por 30s você corre mais rápido.' },
  // ---------- Materiais (vendáveis) ----------
  pele_lobo: { name: 'Pele de Lobo', type: 'material', price: 12, desc: 'Pode ser vendida a mercadores.' },
  po_osso: { name: 'Pó de Osso Antigo', type: 'material', price: 10, desc: 'Usado por alquimistas.' },
  essencia_sombria: { name: 'Essência Sombria', type: 'material', price: 20, desc: 'Fumaça engarrafada de um Eco.' },
  tinta_preta: { name: 'Gota de Tinta Viva', type: 'material', price: 15, desc: 'Ela se mexe sozinha dentro do frasco.' },
  cristal_terra: { name: 'Cristal de Terra', type: 'material', price: 25, desc: 'Brilha com calor suave.' },
  // ---------- Itens de missão ----------
  astrolabio: { name: 'Astrolábio de Vaelthor', type: 'quest', desc: 'Um instrumento dourado que aponta para os fragmentos do Coração.' },
  diario_rei: { name: 'Diário do Rei Aldren', type: 'quest', desc: 'As últimas anotações do rei desaparecido.' },
  flor_lua: { name: 'Flor-da-Lua', type: 'quest', desc: 'Pétalas prateadas que brilham à noite.' },
  tinta_vermelha: { name: 'Pote de Tinta Vermelha', type: 'quest', desc: 'Uma das cores perdidas de Tico.' },
  tinta_amarela: { name: 'Pote de Tinta Amarela', type: 'quest', desc: 'Uma das cores perdidas de Tico.' },
  tinta_azul: { name: 'Pote de Tinta Azul', type: 'quest', desc: 'Uma das cores perdidas de Tico.' },
  presa_alfa: { name: 'Presa da Presa-Branca', type: 'quest', desc: 'Um dente enorme, prova da caçada.' },
  chave_cela: { name: 'Chave da Jaula', type: 'quest', desc: 'Abre a jaula do acampamento do Corvo.' },
  fragmento_fogo: { name: 'Fragmento do Fogo', type: 'quest', desc: 'Um pedaço do Coração de Aether, morno como brasa.' },
  fragmento_agua: { name: 'Fragmento da Água', type: 'quest', desc: 'Um pedaço do Coração de Aether, fresco como orvalho.' },
  fragmento_terra: { name: 'Fragmento da Terra', type: 'quest', desc: 'Um pedaço do Coração de Aether, pesado como montanha.' },
  fragmento_luz: { name: 'Fragmento da Luz', type: 'quest', desc: 'Um pedaço do Coração de Aether, brilhante como o meio-dia.' },
  sino_ovelha: { name: 'Sino de Ovelha', type: 'quest', desc: 'Pendia do pescoço de uma ovelha.' },
  carta_tomas: { name: 'Carta de Tomás', type: 'quest', desc: 'Uma carta amassada endereçada a Bram.' },
  pincel_tico: { name: 'Pincel de Tico', type: 'quest', desc: 'Um pincel que desenha coisas que viram reais. Mais ou menos.' },
};

export function itemName(id) { return ITEMS[id]?.name || id; }
