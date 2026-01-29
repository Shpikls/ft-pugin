import { STORAGE_KEY, TFeatures } from '../types';

interface PageState {
  hasSwitcher: boolean;
  flags: TFeatures | null;
  localStorageFlags: TFeatures | null;
}

async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function getPageState(tabId: number): Promise<PageState> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (storageKey: string) => {
      const hasSwitcher = !!window.featureSwitcher;

      let localStorageFlags: Record<string, boolean> | null = null;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          localStorageFlags = JSON.parse(stored);
        }
      } catch (e) {}

      return {
        hasSwitcher,
        flags: hasSwitcher && window.featureSwitcher?.flags ? { ...window.featureSwitcher.flags } : null,
        localStorageFlags,
      };
    },
    args: [STORAGE_KEY],
  });

  return results[0]?.result || { hasSwitcher: false, flags: null, localStorageFlags: null };
}

async function saveAndReload(tabId: number, flags: Partial<TFeatures>): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (storageKey: string, newFlags: Partial<TFeatures>) => {
      const current = localStorage.getItem(storageKey);
      const existing = current ? JSON.parse(current) : {};
      const merged = { ...existing, ...newFlags };
      localStorage.setItem(storageKey, JSON.stringify(merged));
    },
    args: [STORAGE_KEY, flags],
  });
  await chrome.tabs.reload(tabId);
  window.close();
}

async function toggleFeature(tabId: number, feature: string, enabled: boolean, hasApi: boolean): Promise<void> {
  if (hasApi) {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (feat: string, val: boolean) => {
        if (window.featureSwitcher) {
          window.featureSwitcher.setEnabled(feat as any, val, true);
        }
      },
      args: [feature, enabled],
    });
    window.close();
  } else {
    await saveAndReload(tabId, { [feature]: enabled } as Partial<TFeatures>);
  }
}

function setHeader(title: string, disabled: boolean): void {
  const header = document.getElementById('header');
  const titleEl = document.getElementById('title');
  if (header) {
    header.className = disabled ? 'disabled' : '';
  }
  if (titleEl) {
    titleEl.textContent = title;
  }
}

async function updateIcon(enabled: boolean): Promise<void> {
  const state = enabled ? 'enabled' : 'disabled';
  try {
    await chrome.action.setIcon({
      path: {
        16: `/icons/${state}/icon16.png`,
        48: `/icons/${state}/icon48.png`,
        128: `/icons/${state}/icon128.png`,
      },
    });
  } catch (e) {
    console.error('Failed to update icon:', e);
  }
}

function renderDisabledState(container: HTMLElement, tabId: number): void {
  setHeader('Switcher выключен', true);

  container.innerHTML = `
    <div class="switcher-disabled">
      <button class="enable-btn" id="enableBtn">Включить</button>
    </div>
  `;

  document.getElementById('enableBtn')?.addEventListener('click', () => {
    saveAndReload(tabId, { switcher: true });
  });
}

function renderEnabledState(container: HTMLElement, tabId: number, flags: TFeatures, hasApi: boolean): void {
  setHeader('Switcher', false);

  const featureKeys = Object.keys(flags).sort((a, b) => {
    if (a === 'switcher') return -1;
    if (b === 'switcher') return 1;
    return a.localeCompare(b);
  });

  const featuresHtml = featureKeys
    .map((feature) => {
      const isEnabled = flags[feature] ?? false;
      return `
        <div class="feature-item">
          <span class="feature-name">${feature}</span>
          <label class="toggle">
            <input type="checkbox" data-feature="${feature}" ${isEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `<div class="feature-list">${featuresHtml}</div>`;

  container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const feature = target.dataset.feature;
      if (feature) {
        toggleFeature(tabId, feature, target.checked, hasApi);
      }
    });
  });
}

function renderError(container: HTMLElement, message: string): void {
  setHeader('Ошибка', true);
  container.innerHTML = `<div class="error"><p>${message}</p></div>`;
}

async function init(): Promise<void> {
  const container = document.getElementById('content');
  if (!container) return;

  try {
    const tab = await getCurrentTab();

    if (!tab?.id) {
      renderError(container, 'Вкладка не найдена');
      return;
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
      renderError(container, 'Нет доступа к системным страницам');
      return;
    }

    const state = await getPageState(tab.id);
    const effectiveFlags = state.flags || state.localStorageFlags;
    const switcherEnabled = effectiveFlags?.switcher === true;

    await updateIcon(switcherEnabled);

    if (switcherEnabled && effectiveFlags) {
      renderEnabledState(container, tab.id, effectiveFlags as TFeatures, state.hasSwitcher);
    } else {
      renderDisabledState(container, tab.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    renderError(container, message);
  }
}

document.addEventListener('DOMContentLoaded', init);
