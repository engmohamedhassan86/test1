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
    console.log('Found:', token, '->', match ? match[1] : 'NULL');
    return match ? match[1] : null;
  }

  const content = readFile('src/styles/design-tokens.json');
  const json = JSON.parse(content);
  const tokenEntry = json.tokens.find(t => t.name === token);
  return tokenEntry?.value || null;
}

function calculateRelativeLuminance(colorToken) {
  const hex = getHexFromToken(colorToken);
  if (!hex) return 0;
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  
  console.log('\n=== CALCULATING LUMINANCE FOR:', colorToken, '===');
  console.log('Hex value:', hex);
  console.log('RGB values:', r, g, b);
  
  const r_norm = r / 255;
  const g_norm = g / 255;
  const b_norm = b / 255;
  
  console.log('Normalized (0-1):', r_norm.toFixed(4), g_norm.toFixed(4), b_norm.toFixed(4));
  
  const r_linear = r_norm <= 0.03928 ? r_norm / 12.92 : Math.pow((r_norm + 0.055) / 1.055, 2.4);
  const g_linear = g_norm <= 0.03928 ? g_norm / 12.92 : Math.pow((g_norm + 0.055) / 1.055, 2.4);
  const b_linear = b_norm <= 0.03928 ? b_norm / 12.92 : Math.pow((b_norm + 0.055) / 1.055, 2.4);
  
  console.log('Linear (gamma corrected):', r_linear.toFixed(6), g_linear.toFixed(6), b_linear.toFixed(6));
  
  const luminance = 0.2126 * r_linear + 0.7152 * g_linear + 0.0722 * b_linear;
  console.log('Final luminance:', luminance.toFixed(6));
  
  return luminance;
}

function calculateContrastRatio(foreground, background) {
  console.log('\n=== CALCULATING CONTRAST RATIO ===');
  console.log('Foreground:', foreground);
  console.log('Background:', background);
  
  const fgLuminance = calculateRelativeLuminance(foreground);
  const bgLuminance = calculateRelativeLuminance(background);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  
  console.log('Lighter luminance:', lighter.toFixed(6));
  console.log('Darker luminance:', darker.toFixed(6));
  console.log('Contrast ratio:', ratio.toFixed(2));
  
  return ratio;
}

const fg = '--ds-primitive-color-maroon-950';
const bg = '--ds-primitive-color-white';

const ratio = calculateContrastRatio(fg, bg);
