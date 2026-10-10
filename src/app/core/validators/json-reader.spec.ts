/** T031 — each `require*` helper on a match, a wrong type and a missing value. */

import {
  codePointLength,
  describe as describeValue,
  hasContent,
  missingKeys,
  rejectUnknownKeys,
  requireArray,
  requireBoolean,
  requireInt,
  requireObject,
  requireString,
} from './json-reader';

describe('requireObject', () => {
  it('accepts a plain object', () => {
    expect(requireObject({ a: 1 })).toEqual({ ok: true, value: { a: 1 } });
  });

  it('refuses an array, which is the one wrong type JSON makes easy to confuse', () => {
    expect(requireObject([])).toEqual({ ok: false, actual: 'an array' });
  });

  it('refuses null', () => {
    expect(requireObject(null)).toEqual({ ok: false, actual: 'null' });
  });

  it('refuses a missing value', () => {
    expect(requireObject(undefined)).toEqual({ ok: false, actual: 'nothing' });
  });

  it('refuses a string', () => {
    expect(requireObject('{}')).toEqual({ ok: false, actual: '"{}"' });
  });
});

describe('requireString', () => {
  it('accepts a string, including an empty one', () => {
    expect(requireString('')).toEqual({ ok: true, value: '' });
    expect(requireString('Dana')).toEqual({ ok: true, value: 'Dana' });
  });

  it('refuses a number', () => {
    expect(requireString(4)).toEqual({ ok: false, actual: '4' });
  });

  it('refuses a missing value', () => {
    expect(requireString(undefined)).toEqual({ ok: false, actual: 'nothing' });
  });
});

describe('requireInt', () => {
  it('accepts an integer, including zero and a negative one', () => {
    expect(requireInt(0)).toEqual({ ok: true, value: 0 });
    expect(requireInt(-3)).toEqual({ ok: true, value: -3 });
  });

  it('refuses a fractional number', () => {
    expect(requireInt(2.5)).toEqual({ ok: false, actual: '2.5' });
  });

  it('refuses a numeric string', () => {
    expect(requireInt('3')).toEqual({ ok: false, actual: '"3"' });
  });

  it('refuses a missing value', () => {
    expect(requireInt(undefined)).toEqual({ ok: false, actual: 'nothing' });
  });
});

describe('requireBoolean', () => {
  it('accepts both booleans', () => {
    expect(requireBoolean(true)).toEqual({ ok: true, value: true });
    expect(requireBoolean(false)).toEqual({ ok: true, value: false });
  });

  it('refuses the string "yes", which is the F06 example', () => {
    expect(requireBoolean('yes')).toEqual({ ok: false, actual: '"yes"' });
  });

  it('refuses a missing value', () => {
    expect(requireBoolean(undefined)).toEqual({ ok: false, actual: 'nothing' });
  });
});

describe('requireArray', () => {
  it('accepts an array, including an empty one', () => {
    expect(requireArray([])).toEqual({ ok: true, value: [] });
    expect(requireArray([1])).toEqual({ ok: true, value: [1] });
  });

  it('refuses an object', () => {
    expect(requireArray({})).toEqual({ ok: false, actual: '{}' });
  });

  it('refuses a missing value', () => {
    expect(requireArray(undefined)).toEqual({ ok: false, actual: 'nothing' });
  });
});

describe('rejectUnknownKeys', () => {
  it('finds nothing when every key is allowed', () => {
    expect(rejectUnknownKeys({ a: 1, b: 2 }, ['a', 'b'])).toEqual([]);
  });

  it('finds one unknown key', () => {
    expect(rejectUnknownKeys({ a: 1, placeholder: 'Dana' }, ['a'])).toEqual(['placeholder']);
  });

  it('finds two unknown keys, in document order', () => {
    expect(rejectUnknownKeys({ placeholder: 1, a: 2, hint: 3 }, ['a'])).toEqual([
      'placeholder',
      'hint',
    ]);
  });
});

describe('missingKeys', () => {
  it('finds nothing when every required key is present', () => {
    expect(missingKeys({ id: 'q', title: 'T' }, ['id', 'title'])).toEqual([]);
  });

  it('reports a key in the order it was required, not document order', () => {
    expect(missingKeys({ title: 'T' }, ['id', 'title', 'questions'])).toEqual(['id', 'questions']);
  });

  it('treats an explicit undefined as missing', () => {
    expect(missingKeys({ id: undefined }, ['id'])).toEqual(['id']);
  });
});

describe('codePointLength', () => {
  it('counts an ASCII string', () => {
    expect(codePointLength('Dana')).toBe(4);
  });

  it('measures the trimmed value, so leading and trailing space does not count', () => {
    expect(codePointLength('  Dana  ')).toBe(4);
    expect(codePointLength('  ')).toBe(0);
  });

  it('counts an emoji as one character, not as two UTF-16 units', () => {
    // `'🙂'.length` is 2; contract §2 measures code points, so this must be 1.
    expect('🙂'.length).toBe(2);
    expect(codePointLength('🙂')).toBe(1);
  });

  it('counts a mixed string by code points', () => {
    expect(codePointLength('a🙂b')).toBe(3);
  });
});

describe('hasContent', () => {
  it('is true for a string with non-space characters', () => {
    expect(hasContent(' a ')).toBe(true);
  });

  it('is false for an empty string and for spaces alone', () => {
    expect(hasContent('')).toBe(false);
    expect(hasContent('   ')).toBe(false);
  });
});

describe('describe', () => {
  it('names a missing value as nothing', () => {
    expect(describeValue(undefined)).toBe('nothing');
  });

  it('quotes a string, so "yes" is distinguishable from yes', () => {
    expect(describeValue('yes')).toBe('"yes"');
  });

  it('names an array as an array rather than printing it', () => {
    expect(describeValue([1, 2, 3])).toBe('an array');
  });

  it('prints a number, a boolean and null as themselves', () => {
    expect(describeValue(4)).toBe('4');
    expect(describeValue(true)).toBe('true');
    expect(describeValue(null)).toBe('null');
  });

  it('names a value JSON cannot carry by its type', () => {
    expect(describeValue(10n)).toBe('bigint');
    expect(describeValue(Symbol('s'))).toBe('symbol');
    expect(describeValue(() => undefined)).toBe('function');
  });
});
