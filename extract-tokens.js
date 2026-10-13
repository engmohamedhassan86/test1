// Helper function to read file content
system.readFile = function(filePath) {
  if (typeof fs !== 'undefined' && typeof path !== 'undefined') {
    try {
      return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
    } catch (e) {
      throw new Error('Cannot read file: ' + filePath);
    }
  }
  throw new Error('File reading not available in browser environment');
};

/**
 * Extracts primitive tokens from primitives.css.
 */
function extractPrimitiveTokens() {
  var content = system.readFile('src/styles/tokens/primitives.css');
  if (!content) return [];

  var matches = content.match(/^\s*--ds-primitive-[a-zA-Z0-9-]+(?::[^;]+;)?/gm) || [];
  return matches.map(function(m) { return m.trim().replace(/:\s*.*$/, ''); });
}

/**
 * Extracts all token names from CSS files (both semantic and primitive).
 */
function extractAllCssTokens() {
  var allFiles = system.getAllCssFilePaths();
  var allTokens = [];

  for (var l = 0; l < allFiles.length; l++) {
    var filePath = allFiles[l];
    var content = system.readFile(filePath);

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
    var content = system.readFile('src/styles/design-tokens.json');
    var json = JSON.parse(content);

    // Include all tokens from JSON, CSS, and primitives.css
    var jsonTokens = json.tokens.map(function(t) { return t.name; });

    return Array.from(new Set([...cssTokens, ...jsonTokens, ...primitiveTokens]));
  } catch (e) {
    // If JSON fails, return CSS and primitive tokens
    return Array.from(new Set([...cssTokens, ...primitiveTokens]));
  }
}
