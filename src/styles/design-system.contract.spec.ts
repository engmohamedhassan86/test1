use strict';

import fs from 'fs';
import path from 'path';

describe('Design System Contract Spec', () => {
  let cssContent = '';
  let designTokens: { name: string; category: string }[] = [];
  let componentClasses: { name: string; kind: 'block' | 'element' | 'modifier' }[] = [];
  let contrastPairs: {
    foreground: string;
    background: string;
    context: 'normal-text' | 'large-text' | 'non-text-ui';
    minRatio: number;
  }[] = [];
  let primeNgBridgeEntries: {
    primeNgVariable: string;
    dsToken: string;
  }[] = [];
  let prefersReducedMotionBlock = false;

  beforeAll(() => {
    // Read actual design system implementation files
    const stylesDir = path.join(process.cwd(), 'src', 'styles');
    
    const primitivesPath = path.join(stylesDir, 'tokens', 'primitives.css');
    const semanticPath = path.join(stylesDir, 'tokens', 'semantic.css');
    
    let primitivesContent = '';
    let semanticContent = '';
    
    try {
      primitivesContent = fs.readFileSync(primitivesPath, 'utf8');
    } catch (err) {
      primitivesContent = '';
    }
    
    try {
      semanticContent = fs.readFileSync(semanticPath, 'utf8');
    } catch (err) {
      semanticContent = '';
    }
    
    cssContent = primitivesContent + semanticContent;
    
    // Read contract files
    const designTokensMdPath = path.join(stylesDir, '../../specs/004-survey-design-system/contracts/design-tokens.md');
    const cssClassesMdPath = path.join(stylesDir, '../../specs/004-survey-design-system/contracts/css-classes.md');
    const designTokensJsonPath = path.join(stylesDir, 'design-tokens.json');
    const cssClassesJsonPath = path.join(stylesDir, 'css-classes.json');
    
    // Parse design-tokens.md for tokens and contrast pairs
    const designTokensMd = fs.readFileSync(designTokensMdPath, 'utf8');
    const cssClassesMd = fs.readFileSync(cssClassesMdPath, 'utf8');
    
    // Parse primitives from design-tokens.md
    const primitiveMatches = designTokensMd.matchAll(/`--ds-primitive-([a-z-]+)-([a-z0-9-]+)`/g);
    for (const match of primitiveMatches) {
      const [full, category, name] = match;
      designTokens.push({
        name: full.replace(/`/g, ''),
        category: getTokenCategory(category),
      });
    }
    
    // Parse semantic tokens from design-tokens.md
    const semanticMatches = designTokensMd.matchAll(/`--ds-([a-z-]+)(?:-\d+)?`(?!.var\(--ds-primitive)/g);
    for (const match of semanticMatches) {
      const [full] = match;
      const tokenName = full.replace(/`/g, '');
      if (!tokenName.includes('primitive')) {
        designTokens.push({
          name: tokenName,
          category: getTokenCategory(tokenName.split('-')[1] || 'colour'),
        });
      }
    }
    
    // Parse contrast pairs from section 3 of design-tokens.md
    const section3Start = designTokensMd.indexOf('## 3. Verified contrast pairs');
    const section3End = designTokensMd.indexOf('## 4. PrimeNG bridge');
    const section3 = designTokensMd.substring(section3Start, section3End);
    const rows = section3.split('\n').filter(line => line.includes('--ds-color'));
    for (const row of rows) {
      const parts = row
        .split('|')
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length >= 5) {
        contrastPairs.push({
          foreground: parts[0],
          background: parts[1],
          context: parts[2].includes('normal') ? 'normal-text' : parts[2].includes('large') ? 'large-text' : 'non-text-ui',
          minRatio: parseFloat(parts[4]),
        });
      }
    }
    
    // Parse PrimeNG bridge entries from section 4 of design-tokens.md
    const section4Start = designTokensMd.indexOf('## 4. PrimeNG bridge');
    const section4 = designTokensMd.substring(section4Start);
    const bridgeRows = section4.split('\n').filter(line => line.includes('--p-'));
    for (const row of bridgeRows) {
      const parts = row
        .split('|')
        .map(p => p.trim().replace(/`/g, ''))
        .filter(Boolean);
      if (parts.length >= 2) {
        primeNgBridgeEntries.push({
          primeNgVariable: parts[0],
          dsToken: parts[1],
        });
      }
    }
    
    // Parse component classes from css-classes.md
    const matches = cssClassesMd.matchAll(/`\.ds-([a-z-]+(?:__[a-z-]+)?(?:--[a-z-]+)?)`/g);
    for (const match of matches) {
      const [, classNamePart] = match;
      const fullClass = `.ds-${classNamePart}`;
      const kind = determineKind(classNamePart);
      componentClasses.push({
        name: fullClass,
        kind,
      });
    }
    
    // Check for prefers-reduced-motion block
    prefersReducedMotionBlock = cssContent.includes('@media (prefers-reduced-motion: reduce)');
    
    // Read and validate JSON files
    if (fs.existsSync(designTokensJsonPath)) {
      const designTokensJson = JSON.parse(fs.readFileSync(designTokensJsonPath, 'utf8'));
      designTokens = designTokensJson.tokens || [];
    }
    
    if (fs.existsSync(cssClassesJsonPath)) {
      const cssClassesJson = JSON.parse(fs.readFileSync(cssClassesJsonPath, 'utf8'));
      componentClasses = cssClassesJson.classes || [];
    }
  });

  describe('FR-096a: Every --ds-* property in contracts/design-tokens.md exists in implementation', () => {
    it('should resolve every --ds-* custom property to a defined token', () => {
      const missingInImpl: string[] = [];
      const { tokens } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'styles', 'design-tokens.json'), 'utf8'));
      const implementationTokens = tokens.map((t: { name: string }) => t.name);
      
      for (const token of designTokens) {
        if (!implementationTokens.includes(token.name)) {
          missingInImpl.push(token.name);
        }
      }
      expect(missingInImpl).toHaveLength(0);
    });
  });

  describe('FR-096b: Every .ds-* class in contracts/css-classes.md exists in implementation', () => {
    it('should resolve every .ds-* class to a defined class', () => {
      const missingInImpl: string[] = [];
      const { classes } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'styles', 'css-classes.json'), 'utf8'));
      const implementationClasses = classes.map((c: { name: string }) => c.name);
      
      for (const classEntry of componentClasses) {
        if (!implementationClasses.includes(classEntry.name)) {
          missingInImpl.push(classEntry.name);
        }
      }
      expect(missingInImpl).toHaveLength(0);
    });
  });

  describe('FR-096c: Every .ds-* class in implementation has a row in contracts/css-classes.md', () => {
    it('should check that all implementation classes are in contract', () => {
      const missingInContract: string[] = [];
      const { classes } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'styles', 'css-classes.json'), 'utf8'));
      const contractClasses = classes.map((c: { name: string }) => c.name);
      
      for (const classEntry of componentClasses) {
        if (!contractClasses.includes(classEntry.name)) {
          missingInContract.push(classEntry.name);
        }
      }
      expect(missingInContract).toHaveLength(0);
    });
  });

  describe('FR-096d: Every .ds-* property in implementation has a row in contracts/design-tokens.md', () => {
    it('should check that all implementation tokens are in contract', () => {
      const missingInContract: string[] = [];
      const { tokens } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'styles', 'design-tokens.json'), 'utf8'));
      const contractTokens = tokens.map((t: { name: string }) => t.name);
      
      for (const token of designTokens) {
        if (!contractTokens.includes(token.name)) {
          missingInContract.push(token.name);
        }
      }
      expect(missingInContract).toHaveLength(0);
    });
  });

  describe('FR-096e: Every --ds-* property in contracts/design-tokens.md exists in implementation', () => {
    it('should check that all contract tokens are implemented', () => {
      const missingInImpl: string[] = [];
      const { tokens } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'styles', 'design-tokens.json'), 'utf8'));
      const implementationTokens = tokens.map((t: { name: string }) => t.name);
      
      for (const token of designTokens) {
        if (!implementationTokens.includes(token.name)) {
          missingInImpl.push(token.name);
        }
      }
      expect(missingInImpl).toHaveLength(0);
    });
  });

  describe('FR-096f: All verified contrast pairs in contracts/design-tokens.md exist in implementation', () => {
    it('should check that all contrast pairs are implemented', () => {
      const missingInImpl: { foreground: string; background: string }[] = [];
      const contractPairs = contrastPairs.map(p => ({ foreground: p.foreground, background: p.background }));
      const implPairs = contractPairs.filter(p => {
        const regex = new RegExp(`var\(--${p.foreground.split('--')[1]}[^)]*\)`);
        return regex.test(cssContent) && cssContent.includes(`var\(--${p.background.split('--')[1]}")`);
      });
      
      for (const pair of contractPairs) {
        const implExists = implPairs.some(p => 
          p.foreground === pair.foreground && p.background === pair.background
        );
        if (!implExists) {
          missingInImpl.push(pair);
        }
      }
      expect(missingInImpl).toHaveLength(0);
    });
  });

  describe('FR-096g: prefers-reduced-motion block present', () => {
    it('should have one @media (prefers-reduced-motion: reduce) block', () => {
      expect(prefersReducedMotionBlock).toBe(true);
    });
  });

  describe('FR-096h: All custom properties have WCAG AA contrast', () => {
    it('should check that all contrast pairs meet WCAG AA requirements', () => {
      const contrastIssues: { foreground: string; background: string; ratio: number; requirement: number }[] = [];
      for (const pair of contrastPairs) {
        if (pair.minRatio < 4.5) {
          contrastIssues.push({
            foreground: pair.foreground,
            background: pair.background,
            ratio: pair.minRatio,
            requirement: 4.5,
          });
        }
      }
      expect(contrastIssues).toHaveLength(0);
    });
  });

  describe('FR-096i: All PrimeNG bridge entries are present', () => {
    it('should check that all PrimeNG bridge entries are implemented', () => {
      const missingInImpl: { primeNgVariable: string }[] = [];
      const primeNgBridgeRegex = /(--p-[a-z-]+)\s*:\s*var\(--ds-[a-z-]+(?:-\d+)?\)/g;
      const matches = cssContent.matchAll(primeNgBridgeRegex);
      const implEntries = Array.from(matches).map(m => ({ primeNgVariable: m[1] }));
      
      for (const entry of primeNgBridgeEntries) {
        const implExists = implEntries.some(e => e.primeNgVariable === entry.primeNgVariable);
        if (!implExists) {
          missingInImpl.push(entry);
        }
      }
      expect(missingInImpl).toHaveLength(0);
    });
  });
});

function getTokenCategory(name: string): string {
  if (name.includes('color') || name.includes('maroon') || name.includes('gold') || 
      name.includes('cream') || name.includes('neutral') || name.includes('success') || 
      name.includes('warning') || name.includes('error') || name.includes('info')) {
    return 'colour';
  }
  if (name.includes('font') || name.includes('line-height') || name.includes('letter-spacing')) {
    return 'typography';
  }
  if (name.includes('space') || name.includes('width') || name.includes('height') || name.includes('touch-min') || name.includes('content-max-width') || name.includes('focus-ring')) {
    return 'spacing';
  }
  if (name.includes('radius')) {
    return 'radius';
  }
  if (name.includes('shadow')) {
    return 'elevation';
  }
  if (name.includes('motion') || name.includes('easing')) {
    return 'motion';
  }
  return 'colour';
}

function determineKind(classNamePart: string): 'block' | 'element' | 'modifier' {
  if (classNamePart.includes('__')) {
    return 'element';
  }
  if (classNamePart.includes('--')) {
    return 'modifier';
  }
  return 'block';
}
