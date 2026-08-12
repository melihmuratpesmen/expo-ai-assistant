/**
 * Optional clipboard helper.
 * Prefers expo-clipboard when installed; falls back to React Native Clipboard.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text ?? '';
  if (!value) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExpoClipboard = require('expo-clipboard') as {
      setStringAsync?: (value: string) => Promise<void>;
    };
    if (typeof ExpoClipboard.setStringAsync === 'function') {
      await ExpoClipboard.setStringAsync(value);
      return true;
    }
  } catch {
    // optional peer missing
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native') as {
      Clipboard?: { setString?: (value: string) => void };
    };
    if (typeof rn.Clipboard?.setString === 'function') {
      rn.Clipboard.setString(value);
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}
