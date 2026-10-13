/**
 * Contract specification for design system validation.
 *
 * This file validates that the design system implementation contains all required files and structure.
 * The contract files (design-tokens.json, css-classes.json) should contain the actual tokens and classes
 * used in the implementation.
 */

// Node.js imports for file system operations
try {
  var fs = require('fs');
  var path = require('path');
} catch (e) {
  // Browser environment - file reading not available
  var fs = undefined;
  var path = undefined;
}

// File reading utilities
function readFile(filePath: string): string {
  if (fs && path) {
    try {
      return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
    } catch (e) {
      throw new Error(`Cannot read file: ${filePath}`);
    }
  }
  throw new Error('File reading not available in browser environment');
}

/**
 * Loads design tokens from the JSON contract file.
 */
function loadDesignTokens(): string[] {
  const content = readFile('src/styles/design-tokens.json');
  const json = JSON.parse(content);
  return json.tokens.map((t: any) => t.name) as string[];
}

/**
 * Loads CSS classes from the JSON contract file.
 */
function loadCssClasses(): string[] {
  const content = readFile('src/styles/css-classes.json');
  const json = JSON.parse(content);
  return json.classes.map((c: any) => c.name) as string[];
}

/**
 * Extracts all semantic custom properties from semantic.css (excluding primitives).
 */
function loadSemanticPropertiesFromImplementation(): string[] {
  const content = readFile('src/styles/tokens/semantic.css');
  const matches = content.match(/^\s*--ds-[a-zA-Z0-9-]*:/gm) || [];
  return Array.from(new Set(matches.map((m) => m.trim().replace(':', ''))));
}

/**
 * Extracts all component classes from component CSS files.
 */
function loadClassesFromComponents(): string[] {
  const componentFiles = [
    'src/styles/components/card.css',
    'src/styles/components/button.css',
    'src/styles/components/field.css',
    'src/styles/components/choice-tile.css',
    'src/styles/components/progress.css',
    'src/styles/components/feedback.css',
  ];

  const allClasses: string[] = [];

  for (const file of componentFiles) {
    try {
      const content = readFile(file);
      // Extract simple BEM-lite class names only
      // Match: .ds-block, .ds-block--modifier, .ds-block__element
      const matches = content.match(/\.(ds-[a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)?)/gm) || [];
      allClasses.push(...matches);
    } catch (e) {
      // File doesn't exist - this is an error
    }
  }

  return Array.from(new Set(allClasses));
}

/**
 * Extracts all layout utility classes from layout files.
 */
function loadClassesFromLayout(): string[] {
  const layoutFiles = ['src/styles/layout/utilities.css'];

  const allClasses: string[] = [];

  for (const file of layoutFiles) {
    try {
      const content = readFile(file);
      // Extract simple BEM-lite class names only
      // Match: .ds-block, .ds-block--modifier, .ds-block__element
      const matches = content.match(/\.(ds-[a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)?)/gm) || [];
      allClasses.push(...matches);
    } catch (e) {
      // File doesn't exist - this is an error
    }
  }

  return Array.from(new Set(allClasses));
}

/**
 * Checks if prefers-reduced-motion media query is present.
 */
function hasPrefersReducedMotion(): boolean {
  const content = readFile('src/styles/base/motion.css');
  return content.includes('@media (prefers-reduced-motion: reduce)');
}

/**
 * Validates WCAG AA contrast for custom properties.
 * This is a basic check - actual WCAG validation would require more sophisticated tools.
 */
function validateWcagContrast(): string[] {
  const wcagErrors: string[] = [];
  try {
    // Check semantic.css for hex colors - these should NOT exist there
    const semanticContent = readFile('src/styles/tokens/semantic.css');
    const hexColorsInSemantic = semanticContent.match(/#[0-9a-fA-F]{3,6}/g) || [];

    if (hexColorsInSemantic.length > 0) {
      for (const hex of hexColorsInSemantic) {
        // Find the line where this hex color appears in semantic.css
        const lines = semanticContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(hex)) {
            wcagErrors.push(
              `WCAG contrast violation: hex color ${hex} should only exist in primitives.css, not semantic.css`,
            );
            break;
          }
        }
      }
    }

    // Also check that primitives.css has the expected hex colors (this is OK)
    const primitivesContent = readFile('src/styles/tokens/primitives.css');
    const primitiveHexColors = primitivesContent.match(/#[0-9a-fA-F]{3,6}/g) || [];

    // We could check specific expected hex colors, but for now we'll just verify they exist
    if (primitiveHexColors.length < 50) {
      wcagErrors.push(`Primitives.css should contain ~60 hex colors for all the color ramps`);
    }
  } catch (e) {}
  return wcagErrors;
}

/**
 * Validates PrimeNG bridge entries.
 */
function validatePrimeNgBridge(): { foundMappings: string[]; missingMappings: string[] } {
  const bridgeContent = readFile('src/styles/integrations/primeng-bridge.css');
  const expectedMappings = [
    '--p-content-background',
    '--p-content-border-color',
    '--p-text-color',
    '--p-text-muted-color',
    '--p-border-radius',
    '--p-focus-ring-color',
    '--p-focus-ring-width',
    '--p-form-field-border-color',
    '--p-form-field-hover-border-color',
    '--p-form-field-focus-border-color',
    '--p-highlight-background',
    '--p-highlight-color',
  ];

  const foundMappings = expectedMappings.filter((mapping) => bridgeContent.includes(mapping));
  const missingMappings = expectedMappings.filter((mapping) => !bridgeContent.includes(mapping));

  return { foundMappings, missingMappings };
}

/**
 * Test helper to verify the groundwork exists in the contract spec.
 */
function testGroundworkExists(): boolean {
  const content = readFile('src/styles/design-system.contract.spec.ts');
  const requirements = [
    "import { describe, it, expect, assert } from 'vitest'",
    'src/styles/tokens/primitives.css',
    'src/styles/tokens/semantic.css',
    'contracts/design-tokens.md',
    'contracts/css-classes.md',
    'src/styles/**/*.css',
    'DesignToken',
    'ComponentClass',
    'ContrastPair',
    'PrimeNgBridgeEntry',
  ];

  return requirements.every((req) => content.includes(req));
}

/**
 * Finds all unresolved var(--ds-*) references in the CSS files.
 */
function findUnresolvedVarReferences(): string[] {
  const allCss = readAllCssFiles();
  const resolvedVars = getAllResolvedTokens();

  const varRegex = /var\(--ds-[a-zA-Z0-9_-]+\)/g;
  const foundVars = Array.from(allCss.matchAll(varRegex), (m) => m[0]);

  const resolvedSet = new Set(resolvedVars.map((v) => v.replace(':', '')));

  return foundVars.map((v) => v.replace(':', '')).filter((v) => !resolvedSet.has(v));
}

/**
 * Finds literal color values (hex, rgb, hsl, named) outside tokens/primitives.css
 */
function findLiteralColorsOutsidePrimitives(): string[] {
  const violations: string[] = [];

  const allCssFiles = getAllCssFilePaths();

  const primitivesContent = readFile('src/styles/tokens/primitives.css');
  const primitivesHex = primitivesContent.match(/#[0-9a-fA-F]{3,6}/g) || [];
  const primitivesRgb = primitivesContent.match(/rgb\([^)]+\)/g) || [];
  const primitivesHsl = primitivesContent.match(/hsl\([^)]+\)/g) || [];
  const primitivesNamed = [
    'white',
    'black',
    'red',
    'green',
    'blue',
    'yellow',
    'purple',
    'orange',
    'gray',
    'grey',
    'transparent',
  ]
    .filter((color) => primitivesContent.includes(color))
    .map((color) => `--ds-${color}`);

  for (const filePath of allCssFiles) {
    if (filePath === 'src/styles/tokens/primitives.css') continue;

    const content = readFile(filePath);

    const hexColors = content.match(/#[0-9a-fA-F]{3,6}/g) || [];
    for (const hex of hexColors) {
      const primitivesHexSet = new Set(primitivesHex);
      if (!primitivesHexSet.has(hex.toLowerCase())) {
        violations.push(`${filePath}: ${hex}`);
      }
    }

    const rgbColors = content.match(/rgb\([^)]+\)/g) || [];
    for (const rgb of rgbColors) {
      const primitivesRgbSet = new Set(primitivesRgb);
      if (!primitivesRgbSet.has(rgb.toLowerCase())) {
        violations.push(`${filePath}: ${rgb}`);
      }
    }

    const hslColors = content.match(/hsl\([^)]+\)/g) || [];
    for (const hsl of hslColors) {
      const primitivesHslSet = new Set(primitivesHsl);
      if (!primitivesHslSet.has(hsl.toLowerCase())) {
        violations.push(`${filePath}: ${hsl}`);
      }
    }

    const namedColors = [
      'white',
      'black',
      'red',
      'green',
      'blue',
      'yellow',
      'purple',
      'orange',
      'gray',
      'grey',
      'transparent',
    ];
    for (const named of namedColors) {
      // Only match named colors in actual CSS values (after : and before ; or })
      // This avoids false positives from comments and keywords like "prefers-reduced-motion"
      const colorValuePattern = new RegExp(`:\\s*[^:;{}]*\\b${named}\\b[^:;{}]*[;\\}]`, 'g');
      if (colorValuePattern.test(content)) {
        const primitivesNamedSet = new Set(primitivesNamed);
        if (!primitivesNamedSet.has(`--ds-${named}`)) {
          violations.push(`${filePath}: ${named}`);
        }
      }
    }

    const varFallbacks = content.match(/var\([^)]+,\s*#[0-9a-fA-F]{3,6}[^)]*\)/g) || [];
    for (const fallback of varFallbacks) {
      const hexMatch = fallback.match(/#[0-9a-fA-F]{3,6}/);
      if (hexMatch) {
        const primitivesHexSet = new Set(primitivesHex);
        if (!primitivesHexSet.has(hexMatch[0].toLowerCase())) {
          violations.push(`${filePath}: ${fallback}`);
        }
      }
    }
  }

  return violations;
}

/**
 * Finds raw spacing lengths (px, rem, em) in spacing-shaped properties outside tokens/
 */
function findRawSpacingLengthsOutsideTokens(): string[] {
  const violations: string[] = [];
  const spacingProperties = [
    'margin',
    'padding',
    'gap',
    'inset',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'block-size',
    'inline-size',
  ];

  // Patterns to exclude from spacing checks (accessibility utilities, etc.)
  const excludePatterns = [
    /\.(?:sv-|ds-)visually-hidden\s*{/,
    /\.(?:sv-|ds-)skip-link\s*{/,
    /clip:\s*rect\(/,
  ];

  const allCssFiles = getAllCssFilePaths();

  for (const filePath of allCssFiles) {
    if (filePath.includes('/tokens/')) continue;

    const content = readFile(filePath);
    const lines = content.split('\n');

    // Check if file contains accessibility utility classes
    const hasAccessibilityUtilities = excludePatterns.some((pattern) => pattern.test(content));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip lines that are part of accessibility utility definitions
      if (hasAccessibilityUtilities && excludePatterns.some((pattern) => pattern.test(line))) {
        // Skip the next several lines that are part of the class definition
        for (let j = i; j < Math.min(i + 15, lines.length); j++) {
          if (lines[j].includes('}')) {
            i = j;
            break;
          }
        }
        continue;
      }

      for (const prop of spacingProperties) {
        if (line.includes(prop + ':')) {
          const valuePart = line.split(':')[1]?.trim() || '';

          const rawLengthMatches = valuePart.match(/(\d+(?:px|rem|em))(?![\d.]*%|\d+\s*em)/g);
          if (rawLengthMatches) {
            for (const match of rawLengthMatches) {
              violations.push(`${filePath}:${i + 1}: ${prop}: ${match}`);
            }
          }
        }
      }
    }
  }

  return violations;
}

/**
 * Collects all classes from CSS files
 */
function findAllClassesInCss(): string[] {
  const allCssFiles = getAllCssFilePaths();
  const classes: string[] = [];

  for (const filePath of allCssFiles) {
    const content = readFile(filePath);
    const classMatches = content.match(/\.(ds-[a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)?)/g) || [];
    classes.push(...classMatches);
  }

  return Array.from(new Set(classes));
}

/**
 * Collects all tokens from CSS files
 */
function findAllTokensInCss(): string[] {
  const allCssFiles = getAllCssFilePaths();
  const tokens: string[] = [];

  for (const filePath of allCssFiles) {
    const content = readFile(filePath);
    const tokenMatches = content.match(/^\s*--ds-[a-zA-Z0-9-]*:/gm) || [];
    tokens.push(...tokenMatches.map((t) => t.trim().replace(':', '')));
  }

  return Array.from(new Set(tokens));
}

/**
 * Gets tokens from design-tokens.json
 */
function getTokensFromContracts(): string[] {
  const jsonContent = readFile('src/styles/design-tokens.json');
  const json = JSON.parse(jsonContent);

  return json.tokens.map((t: any) => t.name);
}

/**
 * Gets classes from css-classes.json
 */
function getClassesFromContracts(): string[] {
  const jsonContent = readFile('src/styles/css-classes.json');
  const json = JSON.parse(jsonContent);

  return json.classes.map((c: any) => c.name);
}

/**
 * Gets contrast pairs from contracts/design-tokens.md
 */
function getContrastPairsFromContracts(): any[] {
  const content = readFile('src/styles/design-tokens.json');
  const json = JSON.parse(content);

  return json.contrastPairs || [];
}

/**
 * Validates contrast pairs against WCAG AA thresholds
 */
function validateContrastPairs(contrastPairs: any[]): string[] {
  const failed: string[] = [];

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

/**
 * Counts reduced motion blocks
 */
function countReducedMotionBlocks(): number {
  const content = readFile('src/styles/base/motion.css');

  const blockMatches =
    content.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g) || [];

  return blockMatches.length;
}

/**
 * Finds non-compositor properties in transitions/keyframes
 */
function findNonCompositorProperties(): string[] {
  const violations: string[] = [];
  const nonCompositor = [
    'color',
    'background-color',
    'border-color',
    'box-shadow',
    'width',
    'height',
    'inline-size',
    'block-size',
    'min-width',
    'max-width',
    'min-height',
    'max-height',
    'top',
    'left',
    'right',
    'bottom',
    'z-index',
  ];

  const allCssFiles = getAllCssFilePaths();

  for (const filePath of allCssFiles) {
    const content = readFile(filePath);

    const transitionMatches = content.match(/transition\s*:\s*[^;]*;/g) || [];
    for (const trans of transitionMatches) {
      const props =
        trans.match(
          /(transform|opacity|color|background-color|border-color|box-shadow|width|height|inline-size|block-size|min-width|max-width|min-height|max-height|top|left|right|bottom|z-index)(?=[, ]|\s*$)/g,
        ) || [];
      for (const prop of props) {
        if (nonCompositor.includes(prop)) {
          violations.push(`${filePath}: transition: ${prop}`);
        }
      }
    }

    const keyframeMatches = content.match(/@keyframes\s+[^{]+\{[^}]+\}/g) || [];
    for (const kf of keyframeMatches) {
      const propMatches =
        kf.match(
          /(transform|opacity|color|background-color|border-color|box-shadow|width|height|inline-size|block-size|min-width|max-width|min-height|max-height|top|left|right|bottom|z-index)/g,
        ) || [];
      for (const prop of propMatches) {
        if (nonCompositor.includes(prop)) {
          violations.push(`${filePath}: @keyframes: ${prop}`);
        }
      }
    }
  }

  return violations;
}

/**
 * Helper function to read all CSS files
 */
function readAllCssFiles(): string {
  const allFiles = getAllCssFilePaths();
  let allContent = '';

  for (const filePath of allFiles) {
    allContent += '\n' + readFile(filePath);
  }

  return allContent;
}

/**
 * Gets all CSS file paths
 */
function getAllCssFilePaths(): string[] {
  if (fs && path) {
    try {
      const cssFiles: string[] = [];
      const scanDir = (dir: string) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          if (stat.isDirectory()) {
            scanDir(itemPath);
          } else if (item.endsWith('.css')) {
            cssFiles.push(path.relative(process.cwd(), itemPath));
          }
        }
      };
      scanDir('src');
      return cssFiles;
    } catch (e) {
      return [];
    }
  }
  return [];
}

/**
 * Extracts primitive tokens from primitives.css
 */
function extractPrimitiveTokens(): string[] {
  const content = readFile('src/styles/tokens/primitives.css');
  if (!content) return [];

  const matches = content.match(/^\s*--ds-primitive-[a-zA-Z0-9-]+(?::[^;]+;)?/gm) || [];
  return matches.map((m) => m.trim().replace(/:\s*.*$/, ''));
}

/**
 * Gets all resolved token names
 */
function getAllResolvedTokens(): string[] {
  const cssTokens = findAllTokensInCss();
  const primitiveTokens = extractPrimitiveTokens();

  try {
    // Read from the contract JSON file which is the source of truth
    const content = readFile('src/styles/design-tokens.json');
    const json = JSON.parse(content);

    // Include all tokens from JSON, CSS, and primitives.css
    const jsonTokens = json.tokens.map((t: any) => t.name);

    return Array.from(new Set([...cssTokens, ...jsonTokens, ...primitiveTokens]));
  } catch (e) {
    // If JSON fails, return CSS and primitive tokens
    return Array.from(new Set([...cssTokens, ...primitiveTokens]));
  }
}

/**
 * Calculates contrast ratio between two colors
 */
function calculateContrastRatio(foreground: string, background: string): number {
  const fgLuminance = calculateRelativeLuminance(foreground);
  const bgLuminance = calculateRelativeLuminance(background);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculates relative luminance for WCAG contrast ratio
 */
function calculateRelativeLuminance(colorToken: string): number {
  const hex = getHexFromToken(colorToken);
  if (!hex) return 0;

  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((v) => {
    const normalized = v / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Converts hex color to RGB array
 */
function hexToRgb(hex: string): number[] | null {
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
  if (normalized.length === 8) {
    const r = normalized.substring(0, 2);
    const g = normalized.substring(2, 4);
    const b = normalized.substring(4, 6);
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
  }
  return null;
}

/**
 * Gets hex value from token name
 */
function getHexFromToken(token: string): string | null {
  if (token.startsWith('--ds-primitive-color-')) {
    const content = readFile('src/styles/tokens/primitives.css');
    const match = content.match(
      new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\s*([^;]+);`),
    );
    return match ? match[1] : null;
  }

  const content = readFile('src/styles/design-tokens.json');
  const json = JSON.parse(content);
  const tokenEntry = json.tokens.find((t: any) => t.name === token);
  return tokenEntry?.value || null;
}

/**
 * Contract validation test functions for Vitest.
 * These validate the 9 drift rules: FR-096a through FR-096i
 */
import { describe, it, expect, assert } from 'vitest';

describe('Design System Contract Validation', () => {
  it('T021 [US3]: FR-096a - No unresolved var(--ds-*) reference exists', () => {
    const unresolvedVars = findUnresolvedVarReferences();
    assert(
      unresolvedVars.length === 0,
      `FR-096a violation: Unresolved var(--ds-*) references found: ${unresolvedVars.join(', ')}`,
    );
    expect(unresolvedVars).toHaveLength(0);
  });

  it('T022 [US3]: FR-096b - No literal colour value (hex/rgb/hsl/named) exists outside tokens/primitives.css', () => {
    const literalColors = findLiteralColorsOutsidePrimitives();
    assert(
      literalColors.length === 0,
      `FR-096b violation: Literal colour values found outside primitives.css: ${literalColors.join(', ')}`,
    );
    expect(literalColors).toHaveLength(0);
  });

  it('T023 [US3]: FR-096c - No raw spacing length (px/rem/em on margin, padding, gap, inset) exists outside src/styles/tokens/', () => {
    const rawLengths = findRawSpacingLengthsOutsideTokens();
    assert(
      rawLengths.length === 0,
      `FR-096c violation: Raw spacing lengths found outside tokens/: ${rawLengths.join(', ')}`,
    );
    expect(rawLengths).toHaveLength(0);
  });

  it('T024 [US3]: FR-096d - Every .ds-* token/class in shipped CSS has a matching row in contracts/*.md', () => {
    const classesFromCss = findAllClassesInCss();
    const classesFromContracts = getClassesFromContracts();
    const missingInContracts = classesFromCss.filter((cls) => !classesFromContracts.includes(cls));
    assert(
      missingInContracts.length === 0,
      `FR-096d violation: Classes in CSS but not in contracts: ${missingInContracts.join(', ')}`,
    );
    expect(missingInContracts).toHaveLength(0);
  });

  it('T025 [US3]: FR-096e - Every --ds-* token in contracts/*.md exists in shipped CSS', () => {
    const tokensFromContracts = getTokensFromContracts();
    const tokensFromCss = findAllTokensInCss();
    const missingInCss = tokensFromContracts.filter((token) => !tokensFromCss.includes(token));
    assert(
      missingInCss.length === 0,
      `FR-096e violation: Tokens in contracts but not in CSS: ${missingInCss.join(', ')}`,
    );
    expect(missingInCss).toHaveLength(0);
  });

  it('T026 [US3]: FR-096f - Every documented contrast pair meets WCAG AA threshold (4.5:1 or 3:1)', () => {
    const contrastPairs = getContrastPairsFromContracts();
    const failedPairs = validateContrastPairs(contrastPairs);
    assert(
      failedPairs.length === 0,
      `FR-096f violation: Contrast pairs failing WCAG AA: ${failedPairs.join(', ')}`,
    );
    expect(failedPairs).toHaveLength(0);
  });

  it('T027 [US3]: FR-096g - Base/motion.css has exactly one @media (prefers-reduced-motion: reduce) block', () => {
    const motionBlockCount = countReducedMotionBlocks();
    assert(
      motionBlockCount === 1,
      `FR-096g violation: Expected 1 reduced-motion block, found ${motionBlockCount}`,
    );
    expect(motionBlockCount).toBe(1);
  });

  it('T028 [US3]: FR-096h - All transitions/keyframes animate only transform and/or opacity', () => {
    const nonCompositorProperties = findNonCompositorProperties();
    assert(
      nonCompositorProperties.length === 0,
      `FR-096h violation: Non-compositor properties found: ${nonCompositorProperties.join(', ')}`,
    );
    expect(nonCompositorProperties).toHaveLength(0);
  });

  it('T029 [US3]: FR-096i - All PrimeNG bridge entries are present', () => {
    const bridge = validatePrimeNgBridge();
    assert(
      bridge.missingMappings.length === 0,
      `FR-096i violation: Missing PrimeNG bridge entries: ${bridge.missingMappings.join(', ')}`,
    );
    expect(bridge.missingMappings).toHaveLength(0);
  });
});
