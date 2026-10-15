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
  const primitivesContent = readFile('src/styles/tokens/primitives.css');
  const match = primitivesContent.match(
    new RegExp(`${colorToken.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}:\s*([^;]+);`),
  );
  const hex = match ? match[1] : null;
  if (!hex) return 0;

  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((v) => {
    const normalized = v / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(foreground, background) {
  const fgLuminance = calculateRelativeLuminance(foreground);
  const bgLuminance = calculateRelativeLuminance(background);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

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
        `${pair.foreground} on ${pair.background}: ratio ${ratio.toFixed(2)} < ${pair.minRatio}`,
      );
    }
  }

  return failed;
}

console.log('=== FINAL VERIFICATION OF QA ENGINEER TASKS ===');
console.log();

// Test T021 [US3]: FR-096a - No unresolved var(--ds-*) reference exists
console.log('T021 [US3]: FR-096a - No unresolved var(--ds-*) reference exists');

// Load the entire primitives.css and design-tokens.json
const primitivesContent = readFile('src/styles/tokens/primitives.css');
const designTokensContent = readFile('src/styles/design-tokens.json');

// Extract all primitive tokens from primitives.css
const primitiveTokenMatches =
  primitivesContent.match(/^\s*--ds-primitive-[a-zA-Z0-9-]+(?::[^;]+;)?/gm) || [];
const primitiveTokens = primitiveTokenMatches.map((m) => m.trim().replace(/:\s*.*$/, ''));

// Extract all contract tokens from design-tokens.json
const designTokensJson = JSON.parse(designTokensContent);
const contractTokens = designTokensJson.tokens.map((t) => t.name);

// Extract all semantic tokens from semantic.css
semanticContent = readFile('src/styles/tokens/semantic.css');
semanticTokenMatches = semanticContent.match(/^\s*--ds-[a-zA-Z0-9-]+(?::[^;]+;)?/gm) || [];
semanticTokens = semanticTokenMatches.map((m) => m.trim().replace(/:\s*.*$/, ''));

// Extract all var(--ds-*) references from all CSS files
function extractAllVarReferences() {
  const allFiles = [];
  const scanDir = (dir) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        scanDir(itemPath);
      } else if (item.endsWith('.css')) {
        allFiles.push(path.relative(process.cwd(), itemPath));
      }
    }
  };
  scanDir('src');

  const allReferences = [];
  for (const file of allFiles) {
    const content = readFile(file);
    const varMatches = content.match(/var\(--ds-[a-zA-Z0-9-]+\)/g) || [];
    allReferences.push(...varMatches);
  }

  return allReferences;
}

const allVarReferences = extractAllVarReferences();
const resolvedSet = new Set([...primitiveTokens, ...contractTokens, ...semanticTokens]);
const unresolvedVars = allVarReferences
  .map((v) => v.replace(':', ''))
  .filter((v) => !resolvedSet.has(v));

console.log('  Primitive tokens from primitives.css:', primitiveTokens.length);
console.log('  Contract tokens from design-tokens.json:', contractTokens.length);
console.log('  Semantic tokens from semantic.css:', semanticTokens.length);
console.log('  Total resolved tokens:', resolvedSet.size);
console.log('  Unresolved var(--ds-*) references:', unresolvedVars.length);

if (unresolvedVars.length === 0) {
  console.log('  ✅ PASS');
} else {
  console.log('  ❌ FAIL:', unresolvedVars.join(', '));
}
console.log();

// Test T026 [US3]: FR-096f - Every documented contrast pair meets WCAG AA threshold
console.log('T026 [US3]: FR-096f - Every documented contrast pair meets WCAG AA threshold');

const contrastPairs = getContrastPairsFromContracts();
const failedPairs = validateContrastPairs(contrastPairs);

console.log('  Contrast pairs found:', contrastPairs.length);
console.log('  Contrast pairs failing WCAG AA:', failedPairs.length);

if (failedPairs.length === 0) {
  console.log('  ✅ PASS - All contrast pairs meet WCAG AA requirements');
} else {
  console.log('  ❌ FAIL - Some contrast pairs fail WCAG AA:', failedPairs.join(', '));
}
console.log();

// Summary
console.log('=== SUMMARY ===');
const t021Pass = unresolvedVars.length === 0;
const t026Pass = failedPairs.length === 0;

if (t021Pass && t026Pass) {
  console.log('✅ BOTH CRITICAL TEST FIXES COMPLETED SUCCESSFULLY');
  console.log(
    'The QA Engineer has successfully completed the design system contract validation task.',
  );
} else {
  console.log('❌ SOME TEST FIXES FAILED');
  console.log('T021:', t021Pass ? 'PASS' : 'FAIL');
  console.log('T026:', t026Pass ? 'PASS' : 'FAIL');
}
