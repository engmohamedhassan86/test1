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

function calculateRelativeLuminance(colorToken) {
  const hex = getHexFromToken(colorToken);
  if (!hex) return 0;
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(v => {
    const normalized = v / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
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
  const tokenEntry = json.tokens.find(t => t.name === token);
  return tokenEntry?.value || null;
}

function calculateContrastRatio(foreground, background) {
  const fgLuminance = calculateRelativeLuminance(foreground);
  const bgLuminance = calculateRelativeLuminance(background);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

// Load contrast pairs from design-tokens.json
function getContrastPairsFromContracts() {
  const content = readFile('src/styles/design-tokens.json');
  const json = JSON.parse(content);
  return json.contrastPairs || [];
}

function validateContrastPairs(contrastPairs) {
  const failed = [];

  for (const pair of contrastPairs) {
    const ratio = calculateContrastRatio(pair.foreground, pair.background);

    if (ratio < pair.minRatio) {
      failed.push(
        pair.foreground + ' on ' + pair.background + ': ratio ' + ratio.toFixed(2) + ' < ' + pair.minRatio
      );
    }
  }

  return failed;
}

const contrastPairs = getContrastPairsFromContracts();
const failedPairs = validateContrastPairs(contrastPairs);

console.log('=== TESTING CONTRAST PAIRS ===');
console.log('Found', contrastPairs.length, 'contrast pairs in design-tokens.json');

contrastPairs.forEach((pair, index) => {
  const ratio = calculateContrastRatio(pair.foreground, pair.background);
  const status = ratio >= pair.minRatio ? 'PASS' : 'FAIL';
  console.log('\nPair', index + 1, ':', pair.foreground, 'on', pair.background);
  console.log('  Required ratio:', pair.minRatio);
  console.log('  Actual ratio:', ratio.toFixed(2));
  console.log('  Status:', status);
});

console.log('\n=== VALIDATION RESULTS ===');
console.log('Failed pairs:', failedPairs.length);
if (failedPairs.length > 0) {
  console.log('FAILED:', failedPairs.join(', '));
} else {
  console.log('PASS - All contrast pairs meet WCAG AA threshold');
}
