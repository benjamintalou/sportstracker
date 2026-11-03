/**
 * Hatched fill for the Move IQ share of a sport: same hue as the sport (identity),
 * texture as secondary encoding so "detected" never relies on color alone.
 */
export const hatch = (color: string) =>
  `repeating-linear-gradient(135deg, ${color} 0 3px, color-mix(in srgb, ${color} 35%, transparent) 3px 6px)`;
