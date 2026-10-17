import { argbFromHex, hexFromArgb, Hct, TonalPalette } from "@material/material-color-utilities";

// Seed: brand blue
const seedArgb = argbFromHex("#1d4ed8");
const seedHct = Hct.fromInt(seedArgb);

// M3 baseline palettes (tonal spot variant)
const primary = TonalPalette.fromHueAndChroma(seedHct.hue, Math.max(36, Math.min(seedHct.chroma, 48)));
const secondary = TonalPalette.fromHueAndChroma(seedHct.hue, 16);
const tertiary = TonalPalette.fromHueAndChroma(seedHct.hue + 60, 32);
const neutral = TonalPalette.fromHueAndChroma(seedHct.hue, 4);
const neutralVariant = TonalPalette.fromHueAndChroma(seedHct.hue, 8);
const error = TonalPalette.fromHueAndChroma(25.0, 84.0);

const tone = (p, t) => hexFromArgb(p.tone(t));

const scheme = (isDark) => {
  const P = (t) => tone(primary, t);
  const S = (t) => tone(secondary, t);
  const T = (t) => tone(tertiary, t);
  const N = (t) => tone(neutral, t);
  const NV = (t) => tone(neutralVariant, t);
  const E = (t) => tone(error, t);

  return {
    primary: isDark ? P(80) : P(40),
    "on-primary": isDark ? P(20) : P(100),
    "primary-container": isDark ? P(30) : P(90),
    "on-primary-container": isDark ? P(90) : P(10),
    secondary: isDark ? S(80) : S(40),
    "on-secondary": isDark ? S(20) : S(100),
    "secondary-container": isDark ? S(30) : S(90),
    "on-secondary-container": isDark ? S(90) : S(10),
    tertiary: isDark ? T(80) : T(40),
    "on-tertiary": isDark ? T(20) : T(100),
    "tertiary-container": isDark ? T(30) : T(90),
    "on-tertiary-container": isDark ? T(90) : T(10),
    error: isDark ? E(80) : E(40),
    "on-error": isDark ? E(20) : E(100),
    "error-container": isDark ? E(30) : E(90),
    "on-error-container": isDark ? E(90) : E(10),
    surface: isDark ? N(6) : N(98),
    "on-surface": isDark ? N(90) : N(10),
    "surface-container-lowest": isDark ? N(4) : N(100),
    "surface-container-low": isDark ? N(10) : N(96),
    "surface-container": isDark ? N(12) : N(94),
    "surface-container-high": isDark ? N(17) : N(92),
    "surface-container-highest": isDark ? N(22) : N(90),
    "surface-dim": isDark ? N(6) : N(87),
    "surface-bright": isDark ? N(24) : N(98),
    "on-surface-variant": isDark ? NV(80) : NV(30),
    outline: isDark ? NV(60) : NV(50),
    "outline-variant": isDark ? NV(30) : NV(80),
    "inverse-surface": isDark ? N(90) : N(20),
    "inverse-on-surface": isDark ? N(20) : N(95),
    "inverse-primary": isDark ? P(40) : P(80),
    scrim: N(0),
    shadow: N(0),
  };
};

const toCss = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `  --md-sys-color-${k}: ${v};`)
    .join("\n");

console.log(`:root {
${toCss(scheme(false))}
}

.dark {
${toCss(scheme(true))}
}
`);
