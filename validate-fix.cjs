#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// File reading utilities
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
  } catch (e) {
    throw new Error('Cannot read file: ' + filePath);
  }
}

/**
 * Extracts primitive tokens from primitives.css.
 */
function extractPrimitiveTokens() {
  var content = readFile('src/styles/tokens/primitives.css');
  if (!content) return [];

  var matches = content.match(/^\s*--ds-primitive-[a-zA-Z0-9-]+(?::[^;]+;)?/gm) || [];
  return matches.map(function(m) { return m.trim().replace(/:\s*.*$/, ''); });
}

/**
 * Extracts all token names from CSS files (both semantic and primitive).
 */
function extractAllCssTokens() {
  var allFiles = getAllCssFilePaths();
  var allTokens = [];

  for (var l = 0; l < allFiles.length; l++) {
    var filePath = allFiles[l];
    var content = readFile(filePath);

    // Extract all --ds-* token definitions
    var tokenMatches = content.match(/^\s*--ds-[a-zA-Z0-9-]*:/gm) || [];
    var tokens = tokenMatches.map(function(t) { return t.trim().replace(':', ''); });
    allTokens.push(...tokens);
  }

  return Array.from(new Set(allTokens));
}

/**
 * Gets all resolved token names.
 */
function getAllResolvedTokens() {
  var cssTokens = extractAllCssTokens();
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
 * Main validation function
 */
function validateDesignSystem() {
  console.log('🔍 Validating Design System...\n');

  // Test T021: FR-096a - No unresolved var(--ds-*) reference exists
  console.log('📋 Testing T021: FR-096a - No unresolved var(--ds-*) reference exists');
  
  var allCss = readAllCssFiles();
  var resolvedVars = getAllResolvedTokens();

  var varRegex = /var\(--ds-[a-zA-Z0-9_-]+\)/g;
  var foundVars = Array.from(allCss.matchAll(varRegex), function(m) { return m[0]; });

  var resolvedSet = new Set(resolvedVars.map(function(v) { return v.replace(':', ''); }));

  var unresolvedVars = foundVars.map(function(v) { return v.replace(':', ''); }).filter(function(v) {
    return !resolvedSet.has(v);
  });

  if (unresolvedVars.length === 0) {
    console.log('✅ PASS: No unresolved var(--ds-*) references found');
  } else {
    console.log('❌ FAIL: Found ' + unresolvedVars.length + ' unresolved var(--ds-*) references:');
    console.log(unresolvedVars.join(', '));
    process.exit(1);
  }

  // Test T026: FR-096f - Every documented contrast pair meets WCAG AA threshold
  console.log('\n📋 Testing T026: FR-096f - Every documented contrast pair meets WCAG AA threshold');
  
  var content = readFile('src/styles/design-tokens.json');
  var json = JSON.parse(content);
  var contrastPairs = json.contrastPairs || [];

  var failedPairs = [];
  for (var j = 0; j < contrastPairs.length; j++) {
    var pair = contrastPairs[j];
    var ratio = calculateContrastRatio(pair.foreground, pair.background);

    if (ratio < pair.minRatio) {
      failedPairs.push(
        pair.foreground + ' on ' + pair.background + ': ratio ' + ratio.toFixed(2) + ' < ' + pair.minRatio
      );
    }
  }

  if (failedPairs.length === 0) {
    console.log('✅ PASS: All contrast pairs meet WCAG AA threshold');
  } else {
    console.log('❌ FAIL: Found ' + failedPairs.length + ' contrast pairs failing WCAG AA:');
    console.log(failedPairs.join('\n'));
    process.exit(1);
  }

  console.log('\n🎉 All design system contract validation tests PASSED!');
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

// Run validation
validateDesignSystem();
