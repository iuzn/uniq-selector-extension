document.addEventListener('DOMContentLoaded', async () => {
  const togglePickBtn = document.getElementById('toggle-pick-btn');
  const pickerBtnTitle = document.getElementById('picker-btn-title');
  const pickerBtnDesc = document.getElementById('picker-btn-desc');
  const statusBadge = document.getElementById('status-badge');
  const statusText = statusBadge.querySelector('.status-text');

  const resultSection = document.getElementById('result-section');
  const resultTag = document.getElementById('result-tag');
  const resultType = document.getElementById('result-type');
  const resultSelector = document.getElementById('result-selector');
  const resultVerified = document.getElementById('result-verified');
  const copyResultBtn = document.getElementById('copy-result-btn');
  const copyToast = document.getElementById('copy-toast');

  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  let activeTabId = null;

  await checkActiveTab();
  await loadState();
  await loadHistory();

  async function checkActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      activeTabId = tab.id;
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        togglePickBtn.disabled = true;
        pickerBtnTitle.textContent = 'Inspection Disabled';
        pickerBtnDesc.textContent = 'Cannot inspect chrome settings/internal pages';
        togglePickBtn.style.opacity = '0.6';
        togglePickBtn.style.cursor = 'not-allowed';
      }
    }
  }

  async function loadState() {
    const data = await chrome.storage.local.get(['isPicking', 'lastResult']);
    
    if (data.isPicking) {
      setUiPickingActive();
    } else {
      setUiPickingInactive();
    }

    if (data.lastResult) {
      displayLastResult(data.lastResult);
    }
  }

  function setUiPickingActive() {
    togglePickBtn.classList.add('active');
    pickerBtnTitle.textContent = 'Picking Element...';
    pickerBtnDesc.textContent = 'Hover and click any item on the web page';
    statusBadge.classList.add('active');
    statusText.textContent = 'Inspecting';
  }

  function setUiPickingInactive() {
    togglePickBtn.classList.remove('active');
    pickerBtnTitle.textContent = 'Inspect Element';
    pickerBtnDesc.textContent = 'Click here and hover over elements';
    statusBadge.classList.remove('active');
    statusText.textContent = 'Ready';
  }

  togglePickBtn.addEventListener('click', async () => {
    if (!activeTabId) return;

    const data = await chrome.storage.local.get('isPicking');
    const newState = !data.isPicking;

    await chrome.storage.local.set({ isPicking: newState, pickingTabId: newState ? activeTabId : null });

    if (newState) {
      chrome.tabs.sendMessage(activeTabId, { action: 'start-picking' }, (response) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            files: ['content.js']
          }, () => {
            if (chrome.runtime.lastError) {
              chrome.storage.local.set({ isPicking: false, pickingTabId: null });
              alert('Failed to inspect this page. Please refresh the page and try again.');
            } else {
              chrome.tabs.sendMessage(activeTabId, { action: 'start-picking' });
            }
          });
        }
      });
      window.close();
    } else {
      chrome.tabs.sendMessage(activeTabId, { action: 'stop-picking' });
    }
  });

  function displayLastResult(result) {
    resultSection.classList.remove('hidden');
    resultTag.textContent = result.tagName || 'element';
    resultType.textContent = result.type;
    resultSelector.textContent = result.selector;

    if (result.verifiedUnique) {
      resultVerified.classList.remove('not-unique');
      resultVerified.innerHTML = `
        <svg class="check-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg> Unique
      `;
    } else {
      resultVerified.classList.add('not-unique');
      resultVerified.innerHTML = `
        <svg class="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg> Not Unique
      `;
    }
  }

  copyResultBtn.addEventListener('click', () => {
    const text = resultSelector.textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyToast.classList.add('show');
      setTimeout(() => copyToast.classList.remove('show'), 1500);
    });
  });

  async function loadHistory() {
    const data = await chrome.storage.local.get('history');
    const list = data.history || [];

    if (list.length === 0) {
      historyEmpty.classList.remove('hidden');
      historyList.classList.add('hidden');
      clearHistoryBtn.classList.add('hidden');
      return;
    }

    historyEmpty.classList.add('hidden');
    historyList.classList.remove('hidden');
    clearHistoryBtn.classList.remove('hidden');

    historyList.innerHTML = '';
    list.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <div class="history-content">
          <div class="history-meta">
            <span class="history-tag">${escapeHtml(item.tagName || 'element')}</span>
            <span class="history-type">${item.type}</span>
          </div>
          <div class="history-selector" title="${escapeHtml(item.selector)}">${escapeHtml(item.selector)}</div>
        </div>
        <div class="history-actions">
          <button class="action-btn copy-item-btn" data-index="${index}" title="Copy Selector">
            <svg class="action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
          <button class="action-btn delete-btn delete-item-btn" data-index="${index}" title="Delete Item">
            <svg class="action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;
      historyList.appendChild(li);
    });

    document.querySelectorAll('.copy-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = list[idx];
        navigator.clipboard.writeText(item.selector);
        
        const originalSvg = e.currentTarget.innerHTML;
        e.currentTarget.innerHTML = `
          <svg class="action-icon" style="color: var(--success);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        `;
        setTimeout(() => {
          e.currentTarget.innerHTML = originalSvg;
        }, 1200);
      });
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        list.splice(idx, 1);
        await chrome.storage.local.set({ history: list });
        loadHistory();
      });
    });
  }

  clearHistoryBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({ history: [] });
    loadHistory();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    
    if (changes.isPicking) {
      if (changes.isPicking.newValue) {
        setUiPickingActive();
      } else {
        setUiPickingInactive();
      }
    }
    
    if (changes.lastResult) {
      displayLastResult(changes.lastResult.newValue);
    }
    
    if (changes.history) {
      loadHistory();
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
