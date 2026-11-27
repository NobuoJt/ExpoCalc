export const UI_THEMES = ['original', 'material', 'digital', 'smarthr'] as const;

export type UiTheme = (typeof UI_THEMES)[number];

export const COLOR_MODES = ['light', 'dark'] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

export interface UiThemeMeta {
  label: string;
  description: string;
  themeColor: Record<ColorMode, string>;
}

export const UI_THEME_META: Record<UiTheme, UiThemeMeta> = {
  original: {
    label: 'オリジナル',
    description: 'ExpoCalc 標準の青とグリーン',
    themeColor: { light: '#ffffff', dark: '#242424' },
  },
  material: {
    label: 'マテリアルデザイン',
    description: 'Material Design 3 の紫と面の階層',
    themeColor: { light: '#fef7ff', dark: '#141218' },
  },
  digital: {
    label: 'デジタル庁',
    description: 'デジタル庁デザインシステムの青とフラットな面',
    themeColor: { light: '#ffffff', dark: '#1a1a1c' },
  },
  smarthr: {
    label: 'smartHR',
    description: 'smartHR の青と温かいストーン背景',
    themeColor: { light: '#f8f7f6', dark: '#1c1b1a' },
  },
};

export const THEME_STORAGE_KEY = 'expocalc.theme';
export const COLOR_MODE_STORAGE_KEY = 'expocalc.color-mode';

export function normalizeUiTheme(value: unknown): UiTheme {
  return typeof value === 'string' && (UI_THEMES as readonly string[]).includes(value)
    ? (value as UiTheme)
    : 'original';
}

export function normalizeColorMode(value: unknown): ColorMode {
  return value === 'dark' ? 'dark' : 'light';
}

export function prefersDarkMode(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function readStoredTheme(): UiTheme {
  try {
    return normalizeUiTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'original';
  }
}

export function readStoredColorMode(): ColorMode {
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage が使えない環境では OS 設定に従う
  }
  return prefersDarkMode() ? 'dark' : 'light';
}

export function applyTheme(theme: UiTheme, colorMode: ColorMode): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.colorMode = colorMode;
  root.style.colorScheme = colorMode;

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', UI_THEME_META[theme].themeColor[colorMode]);
}

export function saveTheme(theme: UiTheme, colorMode: ColorMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  } catch {
    // 保存できない環境でも表示だけは切り替える
  }
}
