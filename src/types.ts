// Feature flags - dynamic object from window.featureSwitcher.flags
export type TFeatures = Record<string, boolean>;

export const STORAGE_KEY = 'features';

// Window interface extension for TypeScript
declare global {
  interface Window {
    featureSwitcher?: {
      flags: TFeatures;
      setEnabled: (feature: string, enabled: boolean, reload?: boolean) => void;
    };
  }
}
