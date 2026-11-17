// Ember Grove — the lantern upgrades.
//
// Every level-up offers three cards drawn from this pool. Each upgrade has
// five ranks; a maxed-out upgrade leaves the pool. The descriptions are
// written for the card itself, so the player always knows what a pick does.

export const UPGRADES = [
  {
    id: 'ember',
    name: 'Ember Bolt',
    icon: '✦',
    max: 5,
    blurb: '+25% bolt damage',
    apply(p) { p.boltDamage *= 1.25; },
  },
  {
    id: 'rapid',
    name: 'Quick Wick',
    icon: '≫',
    max: 5,
    blurb: '+18% fire rate',
    apply(p) { p.fireRate *= 1.18; },
  },
  {
    id: 'split',
    name: 'Twin Flames',
    icon: '❖',
    max: 4,
    blurb: '+1 bolt per volley',
    apply(p) { p.multishot += 1; },
  },
  {
    id: 'pierce',
    name: 'Piercing Light',
    icon: '➶',
    max: 3,
    blurb: 'Bolts pierce +1 foe',
    apply(p) { p.pierce += 1; },
  },
  {
    id: 'swift',
    name: 'Swift Boots',
    icon: '➤',
    max: 4,
    blurb: '+12% move speed',
    apply(p) { p.speed *= 1.12; },
  },
  {
    id: 'heart',
    name: 'Warm Heart',
    icon: '♥',
    max: 5,
    blurb: '+20 max health, heal 20',
    apply(p) { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); },
  },
  {
    id: 'magnet',
    name: 'Ember Call',
    icon: '◎',
    max: 4,
    blurb: '+45% ember pickup radius',
    apply(p) { p.magnet *= 1.45; },
  },
  {
    id: 'nova',
    name: 'Kindle Nova',
    icon: '☀',
    max: 4,
    blurb: 'A burning ring (38+ dmg) pulses every 6s',
    apply(p) {
      p.novaLevel += 1;
      p.novaTimer = Math.min(p.novaTimer, 1.2);
    },
  },
  {
    id: 'regen',
    name: 'Moss Mend',
    icon: '✚',
    max: 4,
    blurb: 'Regenerate +0.6 health / s',
    apply(p) { p.regen += 0.6; },
  },
  {
    id: 'aura',
    name: 'Lantern Aura',
    icon: '◉',
    max: 4,
    blurb: 'Light burns nearby foes',
    apply(p) { p.auraLevel += 1; p.auraRadius += 26; },
  },
  {
    id: 'ward',
    name: 'Ember Ward',
    icon: '⬡',
    max: 3,
    blurb: 'Block one hit every 25s',
    apply(p) { p.wardLevel += 1; p.wardTimer = 0; },
  },
  {
    id: 'greed',
    name: 'Gilded Embers',
    icon: '◆',
    max: 3,
    blurb: '+25% score from embers',
    apply(p) { p.scoreMult *= 1.25; },
  },
];

// Draw up to three distinct upgrades the player can still rank up, weighted
// so early levels favour damage and fire rate. Returns fresh card objects.
export function drawChoices(rng, taken) {
  const pool = UPGRADES.filter((u) => (taken[u.id] || 0) < u.max);
  const choices = [];
  const bag = pool.slice();
  while (choices.length < 3 && bag.length > 0) {
    let total = 0;
    const weights = bag.map((u) => {
      const w = (u.id === 'ember' || u.id === 'rapid') && (taken[u.id] || 0) === 0 ? 3 : 1;
      total += w;
      return w;
    });
    let roll = rng() * total;
    let idx = 0;
    for (let i = 0; i < bag.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { idx = i; break; }
    }
    choices.push(bag[idx]);
    bag.splice(idx, 1);
  }
  return choices.map((u) => ({
    id: u.id,
    name: u.name,
    icon: u.icon,
    blurb: u.blurb,
    rank: (taken[u.id] || 0) + 1,
    max: u.max,
  }));
}

// Apply a chosen card to the player and record the rank taken.
export function applyChoice(player, taken, choice) {
  const def = UPGRADES.find((u) => u.id === choice.id);
  if (!def) return;
  taken[choice.id] = (taken[choice.id] || 0) + 1;
  def.apply(player);
}
