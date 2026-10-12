// Contexto global compartilhado entre módulos (evita dependências circulares).
export const G = {
  state: 'boot',          // boot | title | create | intro | play | dialogue | menu | pause | cutscene | dead | ending
  time: { now: 0, dt: 0, hours: 8, day: 1, timeScale: 1, playTime: 0 },
  settings: {
    sensitivity: 1.0,
    invertY: false,
    quality: 'medium',     // low | medium | high
    musicVolume: 0.55,
    sfxVolume: 0.8,
    showDamage: true,
    fov: 65,
  },
  debug: false,
};

export const DAY_LENGTH_SECONDS = 14 * 60; // um dia completo de jogo em segundos reais
