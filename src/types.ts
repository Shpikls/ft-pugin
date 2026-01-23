// Feature flags enum - mirrors frontend-esmp FeatureSwitcher
export enum Feature {
  switcher = 'switcher',
  collabora = 'collabora',
  drawio = 'drawio',
  tiptap = 'tiptap',
}

export type TFeatures = Record<keyof typeof Feature, boolean>;

export const STORAGE_KEY = 'features';

// Window interface extension for TypeScript
declare global {
  interface Window {
    featureSwitcher?: {
      Flags: TFeatures;
      setEnabled: (feature: Feature, enabled: boolean, reload?: boolean) => void;
    };
    features?: typeof Feature;
  }
}
