import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maroonPalette, surveyViewerPreset } from './survey-viewer-preset';

/** Parses the `--sv-maroon-*` declarations out of the design-token stylesheet. */
function readMaroonTokens(): Record<string, string> {
  const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
  const tokens: Record<string, string> = {};

  for (const match of css.matchAll(/--sv-maroon-(\d+):\s*(#[0-9a-fA-F]{3,8});/g)) {
    const [, step, value] = match;
    tokens[step] = value.toLowerCase();
  }

  return tokens;
}

describe('surveyViewerPreset', () => {
  it('overlays the maroon ramp onto the primary semantic scale', () => {
    // `definePreset` deep-merges onto Aura, so `semantic.primary` also carries
    // Aura's own non-numeric keys (color, hoverColor, …). Assert the ramp steps
    // we supplied, not the whole merged object.
    const primary = surveyViewerPreset.semantic?.primary ?? {};

    for (const [step, value] of Object.entries(maroonPalette)) {
      expect(primary).toHaveProperty(step, value);
    }
  });

  it('pins the light-scheme brand colour to the 700 step', () => {
    const light = surveyViewerPreset.semantic?.colorScheme?.light?.primary;

    expect(light?.color).toBe('{primary.700}');
    expect(light?.hoverColor).toBe('{primary.800}');
    expect(light?.activeColor).toBe('{primary.900}');
  });

  it('uses maroon as the 700 brand step', () => {
    expect(maroonPalette[700]).toBe('#800000');
  });

  it('defines every step of the ramp exactly once', () => {
    const steps = Object.keys(maroonPalette);
    expect(steps).toEqual([
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '950',
    ]);
  });

  it('stays in step with the --sv-maroon-* design tokens', () => {
    const tokens = readMaroonTokens();
    const palette = Object.fromEntries(
      Object.entries(maroonPalette).map(([step, value]) => [step, value.toLowerCase()]),
    );

    expect(tokens).toEqual(palette);
  });
});
