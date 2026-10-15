const fs = require('fs');
const path = require('path');

// Simple file reading
function readFile(filePath) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
}

// Test token resolution
function getHexFromToken(token) {
  if (token.startsWith('--ds-primitive-color-')) {
    const content = readFile('src/styles/tokens/primitives.css');
    console.log('Primitives.css contains:', token, '?', content.includes(token));
    const match = content.match(
      new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}:\s*([^;]+);`),
    );
    if (match) {
      console.log('Found match:', token, '->', match[1]);
    } else {
      console.log('No match for:', token);
    }
    return match ? match[1] : null;
  }

  const content = readFile('src/styles/design-tokens.json');
  const json = JSON.parse(content);
  const tokenEntry = json.tokens.find((t) => t.name === token);
  return tokenEntry?.value || null;
}

// Test the tokens from the failing contrast pairs
testTokens = [
  '--ds-primitive-color-maroon-950',
  '--ds-primitive-color-white',
  '--ds-primitive-color-cream-50',
  '--ds-primitive-color-neutral-950',
  '--ds-primitive-color-neutral-700',
  '--ds-primitive-color-cream-100',
  '--ds-primitive-color-neutral-800',
];

console.log('=== TESTING TOKEN RESOLUTION ===');
testTokens.forEach((token) => {
  const hex = getHexFromToken(token);
  console.log(token, '->', hex);
});

console.log('\n=== TESTING CONTRAST CALCULATION ===');
const pairs = [
  ['--ds-primitive-color-maroon-950', '--ds-primitive-color-white'],
  ['--ds-primitive-color-maroon-950', '--ds-primitive-color-cream-50'],
];

function calculateRelativeLuminance(colorToken) {
  const hex = getHexFromToken(colorToken);
  if (!hex) {
    console.log('Cannot resolve:', colorToken);
    return 0;
  }
  console.log('Resolved:', colorToken, '->', hex);

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

function calculateContrastRatio(foreground, background) {
  const fgLuminance = calculateRelativeLuminance(foreground);
  const bgLuminance = calculateRelativeLuminance(background);

  if (!fgLuminance || !bgLuminance) return 0;

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

pairs.forEach(([fg, bg]) => {
  const ratio = calculateContrastRatio(fg, bg);
  console.log(fg, 'on', bg, '-> ratio:', ratio.toFixed(2));
});
