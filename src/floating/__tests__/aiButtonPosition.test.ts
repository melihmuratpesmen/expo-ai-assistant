import { isKeyboardShrink } from '../aiButtonPosition';

describe('isKeyboardShrink', () => {
  const full = { width: 411, height: 721 };

  it('ignores an overlay that only got shorter while the keyboard is open', () => {
    // Android adjustResize: 721 → 409 with a 312dp keyboard.
    expect(isKeyboardShrink(full, { width: 411, height: 409 }, true)).toBe(true);
  });

  it('accepts the same change when the keyboard is closed', () => {
    expect(isKeyboardShrink(full, { width: 411, height: 409 }, false)).toBe(false);
  });

  it('accepts growth and width changes (rotation, split screen)', () => {
    expect(isKeyboardShrink({ width: 411, height: 409 }, full, true)).toBe(false);
    expect(isKeyboardShrink(full, { width: 721, height: 380 }, true)).toBe(false);
  });

  it('accepts the first measurement', () => {
    expect(isKeyboardShrink(null, full, true)).toBe(false);
  });
});
