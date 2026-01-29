import { STORAGE_KEY } from './types';

async function setIconState(tabId: number, enabled: boolean): Promise<void> {
  const state = enabled ? 'enabled' : 'disabled';
  await chrome.action.setIcon({
    tabId,
    path: {
      16: `/icons/${state}/icon16.png`,
      48: `/icons/${state}/icon48.png`,
      128: `/icons/${state}/icon128.png`,
    },
  });
}

async function checkAndUpdateIcon(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);

    // For chrome:// and other restricted pages, show disabled
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      await setIconState(tabId, false);
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageKey: string) => {
        // Check window.featureSwitcher
        if (window.featureSwitcher?.flags?.switcher) {
          return true;
        }
        // Check localStorage
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const flags = JSON.parse(stored);
            return flags.switcher === true;
          }
        } catch (e) {}
        return false;
      },
      args: [STORAGE_KEY],
    });

    const enabled = results[0]?.result || false;
    await setIconState(tabId, enabled);
  } catch (e) {
    // On error, show disabled icon
    try {
      await setIconState(tabId, false);
    } catch {}
  }
}

// Check when tab is activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await checkAndUpdateIcon(activeInfo.tabId);
});

// Check when page loads
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome')) {
    await checkAndUpdateIcon(tabId);
  }
});
