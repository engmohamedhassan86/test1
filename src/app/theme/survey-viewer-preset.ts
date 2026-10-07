import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Maroon brand preset. Design tokens live here and in `src/styles.css`;
 * components must not hard-code brand colours.
 */
export const surveyViewerPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fbf2f2',
      100: '#f5dcdc',
      200: '#ebb8b8',
      300: '#dd8e8e',
      400: '#c96161',
      500: '#b03c3c',
      600: '#96292d',
      700: '#800000',
      800: '#6a0000',
      900: '#560000',
      950: '#3b0000',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.800}',
          focusColor: '{primary.900}',
        },
      },
      dark: {
        primary: {
          color: '{primary.300}',
          contrastColor: '{primary.950}',
          hoverColor: '{primary.200}',
          activeColor: '{primary.100}',
        },
        highlight: {
          background: 'color-mix(in srgb, {primary.300}, transparent 84%)',
          focusBackground: 'color-mix(in srgb, {primary.300}, transparent 76%)',
          color: '{primary.100}',
          focusColor: '{primary.50}',
        },
      },
    },
  },
});
