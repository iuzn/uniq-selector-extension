chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    isPicking: false,
    pickingTabId: null,
    history: []
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ 
    isPicking: false,
    pickingTabId: null
  });
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const data = await chrome.storage.local.get(['isPicking', 'pickingTabId']);
  if (data.isPicking && data.pickingTabId && data.pickingTabId !== activeInfo.tabId) {
    await chrome.storage.local.set({ isPicking: false, pickingTabId: null });
    try {
      chrome.tabs.sendMessage(data.pickingTabId, { action: 'stop-picking' });
    } catch (err) {
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'element-selected') {
    const result = message.data;
    chrome.storage.local.set({ isPicking: false, pickingTabId: null, lastResult: result });
    
    chrome.storage.local.get('history').then((data) => {
      const list = data.history || [];
      if (list.length === 0 || list[0].selector !== result.selector) {
        list.unshift(result);
        if (list.length > 50) {
          list.pop();
        }
        chrome.storage.local.set({ history: list });
      }
    });
  } else if (message.action === 'picking-stopped') {
    chrome.storage.local.set({ isPicking: false, pickingTabId: null });
  }
});

