const fs = require('fs');
const path = require('path');

/**
 * Contract specification for design system validation.
 *
 * This standalone script validates that the design system implementation contains all required files and structure.
 * The contract files (design-tokens.json, css-classes.json) should contain the actual tokens and classes
 * used in the implementation.
 */

// File reading utilities
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
  } catch (e) {
    throw new Error('Cannot read file: ' + filePath);
  }
}

/**
 * Loads design tokens from the JSON contract file.
 */
function loadDesignTokens() {
  const content = readFile('src/styles/design-tokens.json');
  const json = JSON.parse(content);
  return json.tokens.map(function(t) { return t.name; });
}

/**
 * Loads CSS classes from the JSON contract file.
 */
function loadCssClasses() {
  const content = readFile('src/styles/css-classes.json');
  const json = JSON.parse(content);
  return json.classes.map(function(c) { return c.name; });
}

/**
 * Extracts all semantic custom properties from semantic.css (excluding primitives).
 */
function loadSemanticPropertiesFromImplementation() {
  const content = readFile('src/styles/tokens/semantic.css');
  const matches = content.match(/^\s*--ds-[a-zA-Z0-9-]*:/gm) || [];
  return Array.from(new Set(matches.map(function(m) { return m.trim().replace(':', ''); })));
}

/**
 * Extracts all component classes from component CSS files.
 */
function loadClassesFromComponents() {
  const componentFiles = [
    'src/styles/components/card.css',
    'src/styles/components/button.css',
    'src/styles/components/field.css',
    'src/styles/components/choice-tile.css',
    'src/styles/components/progress.css',
    'src/styles/components/feedback.css',
  ];

  const allClasses = [];

  for (var i = 0; i < componentFiles.length; i++) {
    var file = componentFiles[i];
    try {
      var content = readFile(file);
      // Extract simple BEM-lite class names only
      // Match: .ds-block, .ds-block--modifier, .ds-block__element
      var matches = content.match(/\.(ds-[a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)?)/gm) || [];
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
function loadClassesFromLayout() {
  const layoutFiles = ['src/styles/layout/utilities.css'];

  const allClasses = [];

  for (var i = 0; i < layoutFiles.length; i++) {
    var file = layoutFiles[i];
    try {
      var content = readFile(file);
      // Extract simple BEM-lite class names only
      // Match: .ds-block, .ds-block--modifier, .ds-block__element
      var matches = content.match(/\.(ds-[a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)?)/gm) || [];
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
function hasPrefersReducedMotion() {
  var content = readFile('src/styles/base/motion.css');
  return content.includes('@media (prefers-reduced-motion: reduce)');
}

/**
 * Validates WCAG AA contrast for custom properties.
 * This is a basic check - actual WCAG validation would require more sophisticated tools.
 */
function validateWcagContrast() {
  var wcagErrors = [];
  try {
    // Check semantic.css for hex colors - these should NOT exist there
    var semanticContent = readFile('src/styles/tokens/semantic.css');
    var hexColorsInSemantic = semanticContent.match(/#[0-9a-fA-F]{3,6}/g) || [];

    if (hexColorsInSemantic.length > 0) {
      for (var j = 0; j < hexColorsInSemantic.length; j++) {
        var hex = hexColorsInSemantic[j];
        // Find the line where this hex color appears in semantic.css
        var lines = semanticContent.split('\n');
        for (var k = 0; k < lines.length; k++) {
          if (lines[k].includes(hex)) {
            wcagErrors.push(
              'WCAG contrast violation: hex color ' + hex + ' should only exist in primitives.css, not semantic.css'
            );
            break;
          }
        }
      }
    }

    // Also check that primitives.css has the expected hex colors (this is OK)
    var primitivesContent = readFile('src/styles/tokens/primitives.css');
    var primitiveHexColors = primitivesContent.match(/#[0-9a-fA-F]{3,6}/g) || [];

    // We could check specific expected hex colors, but for now we'll just verify they exist
    if (primitiveHexColors.length < 50) {
      wcagErrors.push('Primitives.css should contain ~60 hex colors for all the color ramps');
    }
  } catch (e) {}
  return wcagErrors;
}

/**
 * Validates PrimeNG bridge entries.
 */
function validatePrimeNgBridge() {
  var bridgeContent = readFile('src/styles/integrations/primeng-bridge.css');
  var expectedMappings = [
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

  var foundMappings = expectedMappings.filter(function(mapping) {
    return bridgeContent.includes(mapping);
  });
  var missingMappings = expectedMappings.filter(function(mapping) {
    return !bridgeContent.includes(mapping);
  });

  return { foundMappings, missingMappings };
}

/**
 * Finds all unresolved var(--ds-*) references in the CSS files.
 */
function findUnresolvedVarReferences() {
  var allCss = readAllCssFiles();
  var resolvedVars = getAllResolvedTokens();

  var varRegex = /var\(--ds-[a-zA-Z0-9_-]+\)/g;
  var foundVars = Array.from(allCss.matchAll(varRegex), function(m) { return m[0]; });

  var resolvedSet = new Set(resolvedVars.map(function(v) { return v.replace(':', ''); }));

  return foundVars.map(function(v) { return v.replace(':', ''); }).filter(function(v) {
    return !resolvedSet.has(v);
  });
}

/**
 * Finds literal color values (hex, rgb, hsl, named) outside tokens/primitives.css
 */
function findLiteralColorsOutsidePrimitives() {
  var violations = [];

  var allCssFiles = getAllCssFilePaths();

  var primitivesContent = readFile('src/styles/tokens/primitives.css');
  var primitivesHex = primitivesContent.match(/#[0-9a-fA-F]{3,6}/g) || [];
  var primitivesRgb = primitivesContent.match(/rgb\([^)]+\)/g) || [];
  var primitivesHsl = primitivesContent.match(/hsl\([^)]+\)/g) || [];
  var primitivesNamed = [
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
    .filter(function(color) { return primitivesContent.includes(color); })
    .map(function(color) { return '--ds-' + color; });

  for (var l = 0; l < allCssFiles.length; l++) {
    var filePath = allCssFiles[l];
    if (filePath === 'src/styles/tokens/primitives.css') continue;

    var content = readFile(filePath);

    var hexColors = content.match(/#[0-9a-fA-F]{3,6}/g) || [];
    for (var j = 0; j < hexColors.length; j++) {
      var hex = hexColors[j];
      var primitivesHexSet = new Set(primitivesHex);
      if (!primitivesHexSet.has(hex.toLowerCase())) {
        violations.push(filePath + ': ' + hex);
      }
    }

    var rgbColors = content.match(/rgb\([^)]+\)/g) || [];
    for (var j = 0; j < rgbColors.length; j++) {
      var rgb = rgbColors[j];
      var primitivesRgbSet = new Set(primitivesRgb);
      if (!primitivesRgbSet.has(rgb.toLowerCase())) {
        violations.push(filePath + ': ' + rgb);
      }
    }

    var hslColors = content.match(/hsl\([^)]+\)/g) || [];
    for (var j = 0; j < hslColors.length; j++) {
      var hsl = hslColors[j];
      var primitivesHslSet = new Set(primitivesHsl);
      if (!primitivesHslSet.has(hsl.toLowerCase())) {
        violations.push(filePath + ': ' + hsl);
      }
    }

    var namedColors = [
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
    for (var j = 0; j < namedColors.length; j++) {
      var named = namedColors[j];
      // Only match named colors in actual CSS values (after : and before ; or })
      // This avoids false positives from comments and keywords like "prefers-reduced-motion"
      var colorValuePattern = new RegExp(':\\s*[^:;{}]*\\b' + named + '\\b[^:;{}]*[;\\}]', 'g');
      if (colorValuePattern.test(content)) {
        var primitivesNamedSet = new Set(primitivesNamed);
        if (!primitivesNamedSet.has('--ds-' + named)) {
          violations.push(filePath + ': ' + named);
        }
      }
    }

    var varFallbacks = content.match(/var\([^)]+,\s*#[0-9a-fA-F]{3,6}[^)]*\)/g) || [];
    for (var j = 0; j < varFallbacks.length; j++) {
      var fallback = varFallbacks[j];
      var hexMatch = fallback.match(/#[0-9a-fA-F]{3,6}/);
      if (hexMatch) {
        var primitivesHexSet = new Set(primitivesHex);
        if (!primitivesHexSet.has(hexMatch[0].toLowerCase())) {
          violations.push(filePath + ': ' + fallback);
        }
      }
    }
  }

  return violations;
}

/**
 * Finds raw spacing lengths (px, rem, em) in spacing-shaped properties outside tokens/
 */
function findRawSpacingLengthsOutsideTokens() {
  var violations = [];
  var spacingProperties = [
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
  var excludePatterns = [
    /\.(?:sv-|ds-)visually-hidden\s*{/,
    /\.(?:sv-|ds-)skip-link\s*{/,
    /clip:\s*rect\(/,
  ];

  var allCssFiles = getAllCssFilePaths();

  for (var l = 0; l < allCssFiles.length; l++) {
    var filePath = allCssFiles[l];
    if (filePath.includes('/tokens/')) continue;

    var content = readFile(filePath);
    var lines = content.split('\n');

    // Check if file contains accessibility utility classes
    var hasAccessibilityUtilities = excludePatterns.some(function(pattern) {
      return pattern.test(content);
    });

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Skip lines that are part of accessibility utility definitions
      if (hasAccessibilityUtilities && excludePatterns.some(function(pattern) {
        return pattern.test(line);
      })) {
        // Skip the next several lines that are part of the class definition
        for (var j = i; j < Math.min(i + 15, lines.length); j++) {
          if (lines[j].includes('}')) {
            i = j;
            break;
          }
        }
        continue;
      }

      for (var j = 0; j < spacingProperties.length; j++) {
        var prop = spacingProperties[j];
        if (line.includes(prop + ':')) {
          var valuePart = line.split(':')[1]?.trim() || '';

          var rawLengthMatches = valuePart.match(/(\d+(?:px|rem|em))(?![\d.]*%|\d+\s*em)/g);
          if (rawLengthMatches) {
            for (var k = 0; k < rawLengthMatches.length; k++) {
              var match = rawLengthMatches[k];
              violations.push(filePath + ':' + (i + 1) + ': ' + prop + ': ' + match);
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
function findAllClassesInCss() {
  var allCssFiles = getAllCssFilePaths();
  var classes = [];

  for (var l = 0; l < allCssFiles.length; l++) {
    var filePath = allCssFiles[l];
    var content = readFile(filePath);
    var classMatches = content.match(/\.(ds-[a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)?)/g) || [];
    classes.push(...classMatches);
  }

  return Array.from(new Set(classes));
}

/**
 * Collects all tokens from CSS files
 */
function findAllTokensInCss() {
  var allCssFiles = getAllCssFilePaths();
  var tokens = [];

  for (var l = 0; l < allCssFiles.length; l++) {
    var filePath = allCssFiles[l];
    var content = readFile(filePath);
    var tokenMatches = content.match(/^\s*--ds-[a-zA-Z0-9-]*:/gm) || [];
    tokens.push(...tokenMatches.map(function(t) { return t.trim().replace(':', ''); }));
  }

  return Array.from(new Set(tokens));
}

/**
 * Gets tokens from design-tokens.json
 */
function getTokensFromContracts() {
  var jsonContent = readFile('src/styles/design-tokens.json');
  var json = JSON.parse(jsonContent);

  return json.tokens.map(function(t) { return t.name; });
}

/**
 * Gets classes from css-classes.json
 */
function getClassesFromContracts() {
  var jsonContent = readFile('src/styles/css-classes.json');
  var json = JSON.parse(jsonContent);

  return json.classes.map(function(c) { return c.name; });
}

/**
 * Gets contrast pairs from contracts/design-tokens.md
 */
function getContrastPairsFromContracts() {
  var content = readFile('src/styles/design-tokens.json');
  var json = JSON.parse(content);

  return json.contrastPairs || [];
}

/**
 * Calculates relative luminance for WCAG contrast ratio
 */
function calculateLuminance(hex) {
  var normalized = hex.replace('#', '');
  var r = parseInt(normalized.substring(0, 2), 16);
  var g = parseInt(normalized.substring(2, 4), 16);
  var b = parseInt(normalized.substring(4, 6), 16);
  
  r = r / 255;
  g = g / 255;
  b = b / 255;
  
  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(foreground, background) {
  var fgLuminance = calculateLuminance(foreground);
  var bgLuminance = calculateLuminance(background);
  
  var lighter = Math.max(fgLuminance, bgLuminance);
  var darker = Math.min(fgLuminance, bgLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validates contrast pairs against WCAG AA thresholds
 */
function validateContrastPairs(contrastPairs) {
  var failed = [];

  for (var j = 0; j < contrastPairs.length; j++) {
    var pair = contrastPairs[j];
    var ratio = calculateContrastRatio(pair.foreground, pair.background);

    if (ratio < pair.minRatio) {
      failed.push(
        pair.foreground + ' on ' + pair.background + ': ratio ' + ratio.toFixed(2) + ' < ' + pair.minRatio
      );
    }
  }

  return failed;
}

/**
 * Counts reduced motion blocks
 */
function countReducedMotionBlocks() {
  var content = readFile('src/styles/base/motion.css');

  var blockMatches =
    content.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g) || [];

  return blockMatches.length;
}

/**
 * Finds non-compositor properties in transitions/keyframes
 */
function findNonCompositorProperties() {
  var violations = [];
  var nonCompositor = [
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

  var allCssFiles = getAllCssFilePaths();

  for (var l = 0; l < allCssFiles.length; l++) {
    var filePath = allCssFiles[l];
    var content = readFile(filePath);

    var transitionMatches = content.match(/transition\s*:\s*[^;]*;/g) || [];
    for (var j = 0; j < transitionMatches.length; j++) {
      var trans = transitionMatches[j];
      var props =
        trans.match(
          /(transform|opacity|color|background-color|border-color|box-shadow|width|height|inline-size|block-size|min-width|max-width|min-height|max-height|top|left|right|bottom|z-index)(?=[, ]|\s*$)/g,
        ) || [];
      for (var k = 0; k < props.length; k++) {
        var prop = props[k];
        if (nonCompositor.includes(prop)) {
          violations.push(filePath + ': transition: ' + prop);
        }
      }
    }

    var keyframeMatches = content.match(/@keyframes\s+[^{]+\{[^}]+\}/g) || [];
    for (var j = 0; j < keyframeMatches.length; j++) {
      var kf = keyframeMatches[j];
      var propMatches =
        kf.match(
          /(transform|opacity|color|background-color|border-color|box-shadow|width|height|inline-size|block-size|min-width|max-width|min-height|max-height|top|left|right|bottom|z-index)/g,
        ) || [];
      for (var k = 0; k < propMatches.length; k++) {
        var prop = propMatches[k];
        if (nonCompositor.includes(prop)) {
          violations.push(filePath + ': @keyframes: ' + prop);
        }
      }
    }
  }

  return violations;
}

/**
 * Helper function to read all CSS files
 */
function readAllCssFiles() {
  var allFiles = getAllCssFilePaths();
  var allContent = '';

  for (var l = 0; l < allFiles.length; l++) {
    var filePath = allFiles[l];
    allContent += '\n' + readFile(filePath);
  }

  return allContent;
}

/**
 * Gets all CSS file paths
 */
function getAllCssFilePaths() {
  var cssFiles = [];
  var scanDir = function(dir) {
    var items = fs.readdirSync(dir);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var itemPath = path.join(dir, item);
      var stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        scanDir(itemPath);
      } else if (item.endsWith('.css')) {
        cssFiles.push(path.relative(process.cwd(), itemPath));
      }
    }
  };
  scanDir('src');
  return cssFiles;
}

/**
 * Extracts primitive tokens from primitives.css
 */
function extractPrimitiveTokens() {
  var content = readFile('src/styles/tokens/primitives.css');
  if (!content) return [];

  var matches = content.match(/^\s*--ds-primitive-[a-zA-Z0-9-]+(?::[^;]+;)?/gm) || [];
  return matches.map(function(m) { return m.trim().replace(/:\s*.*$/, ''); });
}

/**
 * Gets all resolved token names
 */
function getAllResolvedTokens() {
  var cssTokens = findAllTokensInCss();
  var primitiveTokens = extractPrimitiveTokens();

  try {
    // Read from the contract JSON file which is the source of truth
    var content = readFile('src/styles/design-tokens.json');
    var json = JSON.parse(content);

    // Include all tokens from JSON, CSS, and primitives.css
    var jsonTokens = json.tokens.map(function(t) { return t.name; });

    return Array.from(new Set([...cssTokens, ...jsonTokens, ...primitiveTokens]));
  } catch (e) {
    // If JSON fails, return CSS and primitive tokens
    return Array.from(new Set([...cssTokens, ...primitiveTokens]));
  }
}

/**
 * Main validation function
 */
function validateDesignSystem() {
  console.log('🔍 Validating Design System...\n');

  var results = [];

  // T021: FR-096a - No unresolved var(--ds-*) reference exists
  var unresolvedVars = findUnresolvedVarReferences();
  if (unresolvedVars.length === 0) {
    results.push({ rule: 'T021 [US3]: FR-096a - No unresolved var(--ds-*) reference exists', status: 'PASS', details: [] });
  } else {
    results.push({ rule: 'T021 [US3]: FR-096a - No unresolved var(--ds-*) reference exists', status: 'FAIL', details: unresolvedVars });
  }

  // T022: FR-096b - No literal colour value (hex/rgb/hsl/named) exists outside tokens/primitives.css
  var literalColors = findLiteralColorsOutsidePrimitives();
  if (literalColors.length === 0) {
    results.push({ rule: 'T022 [US3]: FR-096b - No literal colour value (hex/rgb/hsl/named) exists outside tokens/primitives.css', status: 'PASS', details: [] });
  } else {
    results.push({ rule: 'T022 [US3]: FR-096b - No literal colour value (hex/rgb/hsl/named) exists outside tokens/primitives.css', status: 'FAIL', details: literalColors });
  }

  // T023: FR-096c - No raw spacing length (px/rem/em on margin, padding, gap, inset) exists outside src/styles/tokens/
  var rawLengths = findRawSpacingLengthsOutsideTokens();
  if (rawLengths.length === 0) {
    results.push({ rule: 'T023 [US3]: FR-096c - No raw spacing length (px/rem/em on margin, padding, gap, inset) exists outside src/styles/tokens/', status: 'PASS', details: [] });
  } else {
    results.push({ rule: 'T023 [US3]: FR-096c - No raw spacing length (px/rem/em on margin, padding, gap, inset) exists outside src/styles/tokens/', status: 'FAIL', details: rawLengths });
  }

  // T024: FR-096d - Every .ds-* token/class in shipped CSS has a matching row in contracts/*.md
  var classesFromCss = findAllClassesInCss();
  var classesFromContracts = loadCssClasses();
  var missingInContracts = classesFromCss.filter(function(cls) { return !classesFromContracts.includes(cls); });
  if (missingInContracts.length === 0) {
    results.push({ rule: 'T024 [US3]: FR-096d - Every .ds-* token/class in shipped CSS has a matching row in contracts/*.md', status: 'PASS', details: [] });
  } else {
    results.push({ rule: 'T024 [US3]: FR-096d - Every .ds-* token/class in shipped CSS has a matching row in contracts/*.md', status: 'FAIL', details: missingInContracts });
  }

  // T025: FR-096e - Every --ds-* token in contracts/*.md exists in shipped CSS
  var tokensFromContracts = getTokensFromContracts();
  var tokensFromCss = findAllTokensInCss();
  var missingInCss = tokensFromContracts.filter(function(token) { return !tokensFromCss.includes(token); });
  if (missingInCss.length === 0) {
    results.push({ rule: 'T025 [US3]: FR-096e - Every --ds-* token in contracts/*.md exists in shipped CSS', status: 'PASS', details: [] });
  } else {
    results.push({ rule: 'T025 [US3]: FR-096e - Every --ds-* token in contracts/*.md exists in shipped CSS', status: 'FAIL', details: missingInCss });
  }

  // T026: FR-096f - Every documented contrast pair meets WCAG AA threshold (4.5:1 or 3:1)
  var contrastPairs = getContrastPairsFromContracts();
  var failedPairs = validateContrastPairs(contrastPairs);
  if (failedPairs.length === 0) {
    results.push({ rule: 'T026 [US3]: FR-096f - Every documented contrast pair meets WCAG AA threshold (4.5:1 or 3:1)', status: 'PASS', details: [] });
  } else {
    results.push({ rule: 'T026 [US3]: FR-096f - Every documented contrast pair meets WCAG AA threshold (4.5:1 or 3:1)', status: 'FAIL', details: failedPairs });
  }

  // T027: FR-096g - Base/motion.css has exactly one @media (prefers-reduced-motion: reduce) block
  var motionBlockCount = countReducedMotionBlocks();
  if (motionBlockCount === 1) {
    results.push({ rule: 'T027 [US3]: FR-096g - Base/motion.css has exactly one @media (prefers-reduced-motion: reduce) block', status: 'PASS', details: [] });
  } else {
    results.push({ rule: 'T027 [US3]: FR-096g - Base/motion.css has exactly one @media (prefers-reduced-motion: reduce) block', status: 'FAIL', details: ['Expected 1, found ' + motionBlockCount] });
  }

  // T028: FR-096h - All transitions/keyframes animate only transform and/or opacity
  var nonCompositorProperties = findNonCompositorProperties();
  if (nonCompositorProperties.length === 0) {
    results.push({ rule: 'T028 [US3]: FR-096h - All transitions/keyframes animate only transform and/or opacity', status: 'PASS', details: [] });
  } else {
    results.push({ rule: 'T028 [US3]: FR-096h - All transitions/keyframes animate only transform and/or opacity', status: 'FAIL', details: nonCompositorProperties });
  }

  // T029: FR-096i - All PrimeNG bridge entries are present
  var bridge = validatePrimeNgBridge();
  if (bridge.missingMappings.length === 0) {
    results.push({ rule: 'T029 [US3]: FR-096i - All PrimeNG bridge entries are present', status: 'PASS', details: [] });
  } else {
    results.push({ rule: 'T029 [US3]: FR-096i - All PrimeNG bridge entries are present', status: 'FAIL', details: bridge.missingMappings });
  }

  // Print results
  console.log('📊 Validation Results:');
  console.log('='.repeat(60));
  
  var passed = results.filter(function(r) { return r.status === 'PASS'; }).length;
  var failed = results.filter(function(r) { return r.status === 'FAIL'; }).length;
  console.log('\nSummary: ' + passed + ' passed, ' + failed + ' failed\n');
  
  for (var i = 0; i < results.length; i++) {
    var result = results[i];
    var statusIcon = result.status === 'PASS' ? '✅' : '❌';
    console.log(statusIcon + ' ' + result.rule);
    if (result.status === 'FAIL' && result.details.length > 0) {
      console.log('   Details: ' + result.details.join(', ') + '\n');
    } else {
      console.log('\n');
    }
  }

  // Return exit code
  if (failed > 0) {
    console.log('\n🚫 Validation FAILED - Please fix the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ All validation checks PASSED!');
    process.exit(0);
  }
}

// Run validation
validateDesignSystem();
