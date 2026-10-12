// Ícones SVG desenhados à mão para escolas de poder, atributos e itens.
const wrap = (inner, vb = '0 0 64 64') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

export const SCHOOL_ICONS = {
  fogo: wrap(`<path d="M32 6c4 10 14 14 14 28a14 14 0 0 1-28 0c0-7 4-11 6-15 1 5 3 7 5 8-1-8 1-15 3-21z" fill="#ff7a2a" stroke="#ffd27a" stroke-width="2.5"/><path d="M32 30c3 5 7 7 7 12a7 7 0 0 1-14 0c0-4 4-7 7-12z" fill="#ffe08a"/>`),
  agua: wrap(`<path d="M32 6c8 13 18 22 18 34a18 18 0 0 1-36 0C14 28 24 19 32 6z" fill="#3aa8ff" stroke="#bfe6ff" stroke-width="2.5"/><path d="M24 40a8 8 0 0 0 8 8" stroke="#e6f6ff" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  luz: wrap(`<circle cx="32" cy="32" r="11" fill="#ffe46a" stroke="#fff6c0" stroke-width="2.5"/>${[...Array(8)].map((_, i) => { const a = (i / 8) * Math.PI * 2; const x1 = 32 + Math.cos(a) * 16, y1 = 32 + Math.sin(a) * 16, x2 = 32 + Math.cos(a) * 26, y2 = 32 + Math.sin(a) * 26; return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ffd84a" stroke-width="4" stroke-linecap="round"/>`; }).join('')}`),
  terra: wrap(`<path d="M6 52 L22 22 L30 34 L40 14 L58 52 Z" fill="#b8864a" stroke="#ead1a4" stroke-width="2.5" stroke-linejoin="round"/><path d="M36 22 L40 14 L44 22 Z" fill="#f0f0f0"/>`),
  vento: wrap(`<path d="M8 24 H38 a7 7 0 1 0 -7 -7" stroke="#7ae8c8" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M8 36 H48 a7 7 0 1 1 -7 7" stroke="#bff7e6" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M14 48 H30" stroke="#7ae8c8" stroke-width="4" stroke-linecap="round"/>`),
  psiquico: wrap(`<path d="M6 32 C16 16 48 16 58 32 C48 48 16 48 6 32 Z" fill="#3a1450" stroke="#e070ff" stroke-width="3"/><circle cx="32" cy="32" r="9" fill="#e070ff"/><circle cx="32" cy="32" r="4" fill="#fff"/><path d="M32 6 v6 M32 52 v6 M14 12 l4 5 M50 12 l-4 5" stroke="#f2b8ff" stroke-width="3" stroke-linecap="round"/>`),
  toon: wrap(`<rect x="10" y="18" width="36" height="12" rx="3" fill="#4a4a58" stroke="#111" stroke-width="3"/><path d="M46 20 L58 24 L46 28 Z" fill="#4a4a58" stroke="#111" stroke-width="3" stroke-linejoin="round"/><rect x="22" y="30" width="12" height="10" fill="#3a3a46" stroke="#111" stroke-width="3"/><rect x="14" y="40" width="28" height="8" rx="2" fill="#3a3a46" stroke="#111" stroke-width="3"/><path d="M10 10 l4 4 M18 6 l1 5 M4 18 l5 1" stroke="#ffdf3a" stroke-width="3" stroke-linecap="round"/>`),
  sombra: wrap(`<path d="M40 8 A24 24 0 1 0 56 44 A20 20 0 1 1 40 8 Z" fill="#8a50ff" stroke="#d2b8ff" stroke-width="2.5"/><circle cx="24" cy="30" r="2.5" fill="#fff"/><circle cx="33" cy="30" r="2.5" fill="#fff"/>`),
};

export const ATTR_ICONS = {
  for: wrap(`<path d="M18 40 V24 a5 5 0 0 1 10 0 V20 a5 5 0 0 1 10 0 V22 a5 5 0 0 1 10 0 V40 a14 14 0 0 1 -14 14 H32 A14 14 0 0 1 18 40 Z" fill="#c8794a" stroke="#f3d27a" stroke-width="3"/>`),
  des: wrap(`<path d="M12 52 C20 28 34 14 54 8 C50 28 36 44 12 52 Z" fill="#7ae8c8" stroke="#e8fff6" stroke-width="2.5"/><path d="M12 52 L40 22" stroke="#2a6a5a" stroke-width="2"/>`),
  vit: wrap(`<path d="M32 54 C10 38 6 26 12 18 a12 12 0 0 1 20 2 a12 12 0 0 1 20 -2 C58 26 54 38 32 54 Z" fill="#d83a3a" stroke="#ffb0a0" stroke-width="3"/>`),
  int: wrap(`<path d="M8 14 Q20 10 32 16 Q44 10 56 14 V50 Q44 46 32 52 Q20 46 8 50 Z" fill="#3a6ad0" stroke="#c8d8ff" stroke-width="3"/><path d="M32 16 V52" stroke="#c8d8ff" stroke-width="2"/>`),
  esp: wrap(`<path d="M6 32 C16 16 48 16 58 32 C48 48 16 48 6 32 Z" fill="#4a2a6a" stroke="#d0a0ff" stroke-width="3"/><circle cx="32" cy="32" r="8" fill="#d0a0ff"/>`),
  car: wrap(`<path d="M10 44 L14 18 L24 30 L32 14 L40 30 L50 18 L54 44 Z" fill="#e8b84a" stroke="#fff0b0" stroke-width="3" stroke-linejoin="round"/><rect x="10" y="44" width="44" height="8" fill="#c8983a" stroke="#fff0b0" stroke-width="3"/>`),
};

export const ITEM_ICONS = {
  weapon: wrap(`<path d="M46 6 L58 6 L58 18 L26 50 L14 38 Z" fill="#c8ccd4" stroke="#fff" stroke-width="2"/><path d="M10 34 L30 54" stroke="#8a6a2a" stroke-width="6" stroke-linecap="round"/><path d="M8 52 L16 44" stroke="#5a3a22" stroke-width="7" stroke-linecap="round"/>`),
  armor: wrap(`<path d="M16 10 L26 6 Q32 12 38 6 L48 10 L54 22 L46 26 L46 56 L18 56 L18 26 L10 22 Z" fill="#8a8c94" stroke="#e0e2e8" stroke-width="2.5" stroke-linejoin="round"/>`),
  amulet: wrap(`<path d="M14 8 Q32 30 50 8" stroke="#d8b25a" stroke-width="3" fill="none"/><path d="M32 26 L44 40 L32 58 L20 40 Z" fill="#a46aff" stroke="#f0d8ff" stroke-width="2.5"/>`),
  consumable: wrap(`<path d="M26 6 H38 V18 L50 40 A14 14 0 0 1 38 58 H26 A14 14 0 0 1 14 40 L26 18 Z" fill="#d83a3a" stroke="#ffd0c8" stroke-width="2.5" stroke-linejoin="round"/><rect x="24" y="4" width="16" height="6" rx="2" fill="#8a6a2a"/>`),
  mana: wrap(`<path d="M26 6 H38 V18 L50 40 A14 14 0 0 1 38 58 H26 A14 14 0 0 1 14 40 L26 18 Z" fill="#3a6ad0" stroke="#c8d8ff" stroke-width="2.5" stroke-linejoin="round"/><rect x="24" y="4" width="16" height="6" rx="2" fill="#8a6a2a"/>`),
  food: wrap(`<ellipse cx="32" cy="38" rx="24" ry="16" fill="#d8a050" stroke="#ffe0a0" stroke-width="2.5"/><path d="M18 34 Q24 28 30 34 M34 34 Q40 28 46 34" stroke="#a87030" stroke-width="2.5" fill="none"/>`),
  quest: wrap(`<path d="M14 8 H42 L52 18 V56 H14 Z" fill="#efe2c2" stroke="#8a6f34" stroke-width="2.5"/><path d="M20 24 H44 M20 32 H44 M20 40 H36" stroke="#8a6f34" stroke-width="2.5"/><circle cx="44" cy="48" r="7" fill="#b5332b"/>`),
  material: wrap(`<path d="M32 6 L54 20 L54 44 L32 58 L10 44 L10 20 Z" fill="#6a5a8a" stroke="#d8c8f8" stroke-width="2.5"/><path d="M32 6 V58 M10 20 L54 44 M54 20 L10 44" stroke="#d8c8f8" stroke-width="1" opacity=".6"/>`),
  gold: wrap(`<circle cx="32" cy="32" r="22" fill="#e8b84a" stroke="#fff0b0" stroke-width="3"/><text x="32" y="41" font-size="24" text-anchor="middle" fill="#8a6020" font-family="serif" font-weight="bold">V</text>`),
};

export function itemIcon(item) {
  if (!item) return ITEM_ICONS.quest;
  if (item.type === 'consumable') {
    if (item.mana && !item.heal) return ITEM_ICONS.mana;
    if (item.healFlat) return ITEM_ICONS.food;
    return ITEM_ICONS.consumable;
  }
  return ITEM_ICONS[item.type] || ITEM_ICONS.quest;
}

export const UI_ICONS = {
  quest: wrap(`<path d="M32 4 L38 24 L58 24 L42 36 L48 56 L32 44 L16 56 L22 36 L6 24 L26 24 Z" fill="#f3d27a" stroke="#6a4a14" stroke-width="2.5"/>`),
  npc: wrap(`<circle cx="32" cy="20" r="10" fill="#efe2c2"/><path d="M12 56 a20 18 0 0 1 40 0 Z" fill="#efe2c2"/>`),
  waystone: wrap(`<path d="M24 58 L26 14 L32 6 L38 14 L40 58 Z" fill="#6a7078" stroke="#5ae0ff" stroke-width="3"/><path d="M32 20 V44" stroke="#5ae0ff" stroke-width="4"/>`),
  boss: wrap(`<path d="M10 20 L20 30 L32 10 L44 30 L54 20 L50 50 L14 50 Z" fill="#b5332b" stroke="#ffb0a0" stroke-width="3" stroke-linejoin="round"/>`),
};
