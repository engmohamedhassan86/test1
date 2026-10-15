const fs = require('fs');
const path = require('path');

function readFile(filePath) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const r = normalized[0] + normalized[0];
    const g = normalized[1] + normalized[1];
    const b = normalized[2] + normalized[2];
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
  }
  if (normalized.length === 6) {
    const r = normalized.substring(0, 2);
    const g = normalized.substring(2, 4);
    const b = normalized.substring(4, 6);
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
  }
  return null;
}

function getHexFromToken(token) {
  if (token.startsWith('--ds-primitive-color-')) {
    const content = readFile('src/styles/tokens/primitives.css');
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
    const match = content.match(new RegExp(`${escapedToken}:\s*([^;]+);`));
    return match ? match[1] : null;
  }

  const content = readFile('src/styles/design-tokens.json');
  const json = JSON.parse(content);
  const tokenEntry = json.tokens.find((t) => t.name === token);
  return tokenEntry?.value || null;
}

function calculateRelativeLuminance(colorToken) {
  const hex = getHexFromToken(colorToken);
  if (!hex) return 0;
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;

  console.log('Processing:', colorToken, '-> hex:', hex, '-> rgb:', rgb);

  const r_norm = r / 255;
  const g_norm = g / 255;
  const b_norm = b / 255;

  console.log('Normalized:', r_norm, g_norm, b_norm);

  const r_linear = r_norm <= 0.03928 ? r_norm / 12.92 : Math.pow((r_norm + 0.055) / 1.055, 2.4);
  const g_linear = g_norm <= 0.03928 ? g_norm / 12.92 : Math.pow((g_norm + 0.055) / 1.055, 2.4);
  const b_linear = b_norm <= 0.03928 ? b_norm / 12.92 : Math.pow((b_norm + 0.055) / 1.055, 2.4);

  console.log('Linear:', r_linear, g_linear, b_linear);

  const luminance = 0.2126 * r_linear + 0.7152 * g_linear + 0.0722 * b_linear;
  console.log('Luminance:', luminance);

  return luminance;
}

function calculateContrastRatio(foreground, background) {
  const fgLuminance = calculateRelativeLuminance(foreground);
  const bgLuminance = calculateRelativeLuminance(background);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

// Test the first pair
console.log('=== TESTING FIRST CONTRAST PAIR ===');
const fg = '--ds-primitive-color-maroon-950';
const bg = '--ds-primitive-color-white';

console.log('Foreground:', fg);
console.log('Background:', bg);

const ratio = calculateContrastRatio(fg, bg);
console.log('\nContrast ratio:', ratio.toFixed(2));
