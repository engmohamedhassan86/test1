const fs = require('fs');

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

function calculateRelativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const normalized = v / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(foregroundHex, backgroundHex) {
  const fgLuminance = calculateRelativeLuminance(foregroundHex);
  const bgLuminance = calculateRelativeLuminance(backgroundHex);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

console.log('=== SIMPLE CONTRAST VALIDATION ===');
console.log('Testing the actual contrast pairs from design-tokens.json');
console.log();

// Manually extract the hex values from primitives.css
simpleExtract = function () {
  const primitivesContent = fs.readFileSync('src/styles/tokens/primitives.css', 'utf-8');
  const tokens = {};

  // Simple line-by-line parsing
  const lines = primitivesContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('--ds-primitive-color-')) {
      // Look for the -- prefix in the token name
      const match = line.match(/(---?ds-[a-zA-Z0-9-]+)\s*:\s*([^;]+);/);
      if (match) {
        tokens[match[1]] = match[2];
        console.log('Found:', match[1], '->', match[2]);
      }
    }
  }

  return tokens;
};

const tokens = simpleExtract();

const contrastPairs = [
  { fg: '--ds-primitive-color-maroon-950', bg: '--ds-primitive-color-white', required: 4.5 },
  { fg: '--ds-primitive-color-maroon-950', bg: '--ds-primitive-color-cream-50', required: 4.5 },
  { fg: '--ds-primitive-color-neutral-950', bg: '--ds-primitive-color-cream-50', required: 4.5 },
  { fg: '--ds-primitive-color-neutral-700', bg: '--ds-primitive-color-cream-100', required: 3 },
  { fg: '--ds-primitive-color-neutral-800', bg: '--ds-primitive-color-cream-50', required: 3 },
];

console.log('\nTokens found:', Object.keys(tokens).length);
console.log(
  'Looking for tokens:',
  contrastPairs.map((p) => p.fg + ' and ' + p.bg),
);
console.log();

let allPassed = true;

contrastPairs.forEach((pair, index) => {
  const fgHex = tokens[pair.fg];
  const bgHex = tokens[pair.bg];

  if (!fgHex || !bgHex) {
    console.log('Pair', index + 1, ': MISSING TOKENS!');
    console.log('  ' + pair.fg + ': ' + (fgHex || 'NOT FOUND'));
    console.log('  ' + pair.bg + ': ' + (bgHex || 'NOT FOUND'));
    allPassed = false;
    return;
  }

  console.log(
    'Pair',
    index + 1,
    ': ' + pair.fg + ' (' + fgHex + ') on ' + pair.bg + ' (' + bgHex + ')',
  );
  console.log('  Required ratio: ' + pair.required);

  const ratio = calculateContrastRatio(fgHex, bgHex);
  console.log('  Calculated ratio: ' + ratio.toFixed(2));

  if (ratio >= pair.required) {
    console.log('  Result: ✅ PASS (meets WCAG AA requirement)');
  } else {
    console.log('  Result: ❌ FAIL (does not meet WCAG AA requirement)');
    allPassed = false;
  }
  console.log();
});

console.log('=== FINAL VERIFICATION ===');
if (allPassed) {
  console.log('✅ ALL CONTRAST PAIRS MEET WCAG AA REQUIREMENTS');
  console.log("The QA Engineer's implementation is correct.");
} else {
  console.log('❌ SOME CONTRAST PAIRS FAIL WCAG AA VALIDATION');
  console.log("The QA Engineer's implementation needs to be reviewed.");
}
