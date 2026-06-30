let isPicking = false;
let hoveredElement = null;
let overlayEl = null;

const STABLE_ID_REGEX = /^[A-Za-z][\w-]*$/;
const DYNAMIC_TOKEN_REGEX = /\d{5,}/;

function escapeAttr(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function isUniqueCssSelector(root, selector, target) {
  try {
    const matches = root.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === target;
  } catch {
    return false;
  }
}

function isUniqueXPath(root, xpath, target) {
  try {
    const ownerDoc = root.ownerDocument || root;
    const result = ownerDoc.evaluate(
      xpath,
      root,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    return result.snapshotLength === 1 && result.snapshotItem(0) === target;
  } catch {
    return false;
  }
}

function isStableToken(token) {
  if (!token || token.length > 50) return false;
  if (DYNAMIC_TOKEN_REGEX.test(token)) return false;
  return STABLE_ID_REGEX.test(token);
}

function generateUniqueSelector(target, root = document) {
  const searchRoot = root;

  const id = target.id;
  if (id && isStableToken(id)) {
    const idSelector = `#${CSS.escape(id)}`;
    if (isUniqueCssSelector(searchRoot, idSelector, target)) {
      return { selector: idSelector, type: 'id', verifiedUnique: true };
    }
  }

  const tagName = target.tagName.toLowerCase();

  const targetAttributes = ['data-testid', 'data-id', 'data-qa', 'data-cy', 'name', 'placeholder'];
  for (const attr of targetAttributes) {
    const value = target.getAttribute(attr);
    if (value) {
      const attrSelector = `[${attr}="${escapeAttr(value)}"]`;
      if (isUniqueCssSelector(searchRoot, attrSelector, target)) {
        return { selector: attrSelector, type: 'attribute', verifiedUnique: true };
      }
      const tagAttrSelector = `${tagName}[${attr}="${escapeAttr(value)}"]`;
      if (isUniqueCssSelector(searchRoot, tagAttrSelector, target)) {
        return { selector: tagAttrSelector, type: 'attribute', verifiedUnique: true };
      }
    }
  }

  const classes = Array.from(target.classList).filter(isStableToken);
  if (classes.length > 0) {
    const classSelector = tagName + classes.map(c => `.${CSS.escape(c)}`).join('');
    if (isUniqueCssSelector(searchRoot, classSelector, target)) {
      return { selector: classSelector, type: 'class', verifiedUnique: true };
    }
  }

  const pathParts = [];
  let current = target;

  while (current && current !== root && current.nodeType === Node.ELEMENT_NODE) {
    let segment = current.tagName.toLowerCase();

    const currId = current.id;
    if (currId && isStableToken(currId)) {
      segment += `#${CSS.escape(currId)}`;
    } else {
      const testId = current.getAttribute('data-testid') || current.getAttribute('data-id');
      if (testId) {
        segment += `[data-testid="${escapeAttr(testId)}"]`;
      } else {
        const currClasses = Array.from(current.classList).filter(isStableToken);
        if (currClasses.length > 0) {
          segment += currClasses.map(c => `.${CSS.escape(c)}`).join('');
        }
      }
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const identicalSiblings = siblings.filter(s => s.tagName === current.tagName);
      if (identicalSiblings.length > 1) {
        const index = identicalSiblings.indexOf(current) + 1;
        segment += `:nth-of-type(${index})`;
      }
    }

    pathParts.unshift(segment);
    const candidatePath = pathParts.join(' > ');

    if (isUniqueCssSelector(searchRoot, candidatePath, target)) {
      return { selector: candidatePath, type: 'css-path', verifiedUnique: true };
    }

    current = current.parentElement;
  }

  const xpath = generateFallbackXPath(target);
  const isXPathUnique = isUniqueXPath(root, xpath, target);
  return {
    selector: xpath,
    type: 'xpath',
    verifiedUnique: isXPathUnique
  };
}

function generateFallbackXPath(element) {
  const paths = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.nodeName.toLowerCase();
    const hasNextSiblings = checkNextSiblingsForSameTag(current);
    const indexPart = (index > 0 || hasNextSiblings) ? `[${index + 1}]` : '';
    
    paths.unshift(`${tagName}${indexPart}`);
    current = current.parentElement;
  }

  return `/${paths.join('/')}`;
}

function checkNextSiblingsForSameTag(element) {
  let sibling = element.nextSibling;
  while (sibling) {
    if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
      return true;
    }
    sibling = sibling.nextSibling;
  }
  return false;
}

let widgetContainerEl = null;

function createOverlay() {
  if (overlayEl) return;
  overlayEl = document.createElement('div');
  overlayEl.id = 'uniq-selector-overlay';
  Object.assign(overlayEl.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483647',
    border: '2px solid #0ea5e9',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: '4px',
    boxShadow: '0 0 12px rgba(14, 165, 233, 0.25)',
    transition: 'all 0.08s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'none',
    boxSizing: 'border-box'
  });
  document.documentElement.appendChild(overlayEl);
}

function removeOverlay() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

function updateOverlay(el) {
  if (!el || !overlayEl) {
    if (overlayEl) overlayEl.style.display = 'none';
    return;
  }
  const rect = el.getBoundingClientRect();
  Object.assign(overlayEl.style, {
    display: 'block',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  });
}

async function createWidget() {
  if (widgetContainerEl) return;

  widgetContainerEl = document.createElement('div');
  widgetContainerEl.id = 'uniq-selector-widget-container';
  Object.assign(widgetContainerEl.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '360px',
    height: 'auto',
    zIndex: '2147483647',
    borderRadius: '12px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
    overflow: 'hidden',
    backgroundColor: '#0c0d0e',
    border: '1px solid #24272c',
    transition: 'opacity 0.2s ease',
    boxSizing: 'border-box'
  });

  const shadow = widgetContainerEl.attachShadow({ mode: 'open' });

  // Load external stylesheet popup.css
  try {
    const cssUrl = chrome.runtime.getURL('popup.css');
    const res = await fetch(cssUrl);
    const cssText = await res.text();
    const styleEl = document.createElement('style');
    styleEl.textContent = cssText;
    shadow.appendChild(styleEl);
  } catch (err) {
    console.error('Failed to load popup.css in widget shadow DOM:', err);
  }

  // Create app wrapper div styled like popup body
  const bodyWrapper = document.createElement('div');
  bodyWrapper.className = 'app-body';
  Object.assign(bodyWrapper.style, {
    fontFamily: "var(--font-sans)",
    backgroundColor: "var(--bg-base)",
    color: "var(--text-primary)",
    width: "360px",
    minHeight: "440px",
    display: "flex",
    flexDirection: "column"
  });

  bodyWrapper.innerHTML = `
    <div class="app-container">
      <header class="header">
        <div class="brand">
          <img src="${chrome.runtime.getURL('icons/icon-32.png')}" alt="Logo" class="logo">
          <span class="title">Uniq Selector</span>
        </div>
        <div class="status-badge active" id="widget-status-badge">
          <span class="indicator"></span>
          <span class="status-text">Inspecting</span>
        </div>
      </header>

      <div class="picker-panel">
        <button id="widget-toggle-pick-btn" class="picker-btn active">
          <div class="picker-icon-wrapper">
            <svg id="Mouse cursor" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6">
              <path d="M21 11.9996H19.9551M4.04493 11.9996H3M18.5001 5.49884L17.4999 6.49902M5.52355 18.521L6.52372 17.5208M5.50074 5.5226L6.50092 6.5218M18.522 18.4992L17.5218 17.499M11.9996 19.9988V20.999M11.9996 3V4.00018" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M15.1208 13.3309L13.2926 13.7405C13.2391 13.7521 13.1924 13.7852 13.1632 13.8309L12.2827 15.2076C11.8546 15.878 10.8301 15.697 10.656 14.9216L9.67333 10.0423C9.49917 9.264 10.3524 8.66467 11.0247 9.09082L15.4039 11.7022C16.0772 12.1293 15.8982 13.1567 15.1208 13.3309Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            </svg>
          </div>
          <div class="picker-text">
            <span class="picker-title" id="widget-picker-title">Picking Element...</span>
            <span class="picker-desc" id="widget-picker-desc">Hover and click any item on the web page</span>
          </div>
        </button>
      </div>

      <section class="result-section hidden" id="widget-result-section">
        <div class="section-header">
          <h2>Last Selected Element</h2>
          <span class="verified-badge" id="widget-result-verified">
            <svg class="check-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Unique
          </span>
        </div>
        
        <div class="result-card">
          <div class="result-meta">
            <span class="tag-badge" id="widget-result-tag">div</span>
            <span class="type-badge" id="widget-result-type">css-path</span>
          </div>
          <div class="selector-display-container">
            <code class="selector-code" id="widget-result-selector">div.container > button.btn</code>
            <button class="icon-btn copy-btn" id="widget-copy-btn" title="Copy to clipboard">
              <svg class="copy-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span class="toast" id="widget-copy-toast">Copied!</span>
            </button>
          </div>
        </div>
      </section>

      <section class="history-section">
        <div class="section-header">
          <h2>History</h2>
          <button id="widget-clear-history-btn" class="text-btn hidden">Clear All</button>
        </div>
        <div id="widget-history-empty" class="history-empty">
          <p>No selectors generated yet. Click above to start inspecting.</p>
        </div>
        <ul class="history-list" id="widget-history-list">
        </ul>
      </section>

      <footer class="footer">
        <span>Uniq Selector Extension v1.0.0</span>
      </footer>
    </div>
  `;

  shadow.appendChild(bodyWrapper);
  document.body.appendChild(widgetContainerEl);

  // Hook up event listeners inside shadow DOM
  const togglePickBtn = shadow.getElementById('widget-toggle-pick-btn');
  const copyBtn = shadow.getElementById('widget-copy-btn');
  const clearHistoryBtn = shadow.getElementById('widget-clear-history-btn');

  togglePickBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get('isPicking');
    const newState = !data.isPicking;
    chrome.storage.local.set({ isPicking: newState });
    if (!newState) {
      stopPicking();
    } else {
      startPicking();
    }
  });

  copyBtn.addEventListener('click', () => {
    const codeEl = shadow.getElementById('widget-result-selector');
    navigator.clipboard.writeText(codeEl.textContent).then(() => {
      const toast = shadow.getElementById('widget-copy-toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1500);
    });
  });

  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.set({ history: [] });
  });

  // Initial render
  const localData = await chrome.storage.local.get(['lastResult', 'history']);
  if (localData.lastResult) {
    updateWidgetResult(localData.lastResult, shadow);
  }
  if (localData.history) {
    updateWidgetHistory(localData.history, shadow);
  }
}

function removeWidget() {
  if (widgetContainerEl) {
    widgetContainerEl.remove();
    widgetContainerEl = null;
  }
}

function updateWidgetResult(result, root = widgetContainerEl?.shadowRoot) {
  if (!root || !result) return;
  const section = root.getElementById('widget-result-section');
  const tag = root.getElementById('widget-result-tag');
  const type = root.getElementById('widget-result-type');
  const code = root.getElementById('widget-result-selector');
  const verified = root.getElementById('widget-result-verified');

  if (section) section.classList.remove('hidden');
  if (tag) tag.textContent = result.tagName || 'element';
  if (type) type.textContent = result.type;
  if (code) code.textContent = result.selector;

  if (verified) {
    if (result.verifiedUnique) {
      verified.classList.remove('not-unique');
      verified.innerHTML = `
        <svg class="check-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg> Unique
      `;
    } else {
      verified.classList.add('not-unique');
      verified.innerHTML = `
        <svg class="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg> Not Unique
      `;
    }
  }
}

function updateWidgetHistory(list, root = widgetContainerEl?.shadowRoot) {
  if (!root) return;
  const historyList = root.getElementById('widget-history-list');
  const historyEmpty = root.getElementById('widget-history-empty');
  const clearHistoryBtn = root.getElementById('widget-clear-history-btn');

  if (!historyList || !historyEmpty || !clearHistoryBtn) return;

  if (!list || list.length === 0) {
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
          <span class="history-tag">${item.tagName || 'element'}</span>
          <span class="history-type">${item.type}</span>
        </div>
        <code class="history-code">${item.selector}</code>
      </div>
      <button class="icon-btn copy-history-btn" data-index="${index}" title="Copy to clipboard">
        <svg class="copy-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      </button>
    `;

    li.querySelector('.copy-history-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(item.selector).then(() => {
        const btn = li.querySelector('.copy-history-btn');
        btn.classList.add('success');
        setTimeout(() => btn.classList.remove('success'), 1000);
      });
    });

    historyList.appendChild(li);
  });
}

function updateWidgetPickingState(isPickingActive, root = widgetContainerEl?.shadowRoot) {
  if (!root) return;
  const togglePickBtn = root.getElementById('widget-toggle-pick-btn');
  const pickerTitle = root.getElementById('widget-picker-title');
  const pickerDesc = root.getElementById('widget-picker-desc');
  const statusBadge = root.getElementById('widget-status-badge');
  const statusText = statusBadge?.querySelector('.status-text');

  if (!togglePickBtn || !pickerTitle || !pickerDesc || !statusBadge) return;

  if (isPickingActive) {
    togglePickBtn.classList.add('active');
    pickerTitle.textContent = 'Picking Element...';
    pickerDesc.textContent = 'Hover and click any item on the web page';
    statusBadge.classList.add('active');
    if (statusText) statusText.textContent = 'Inspecting';
  } else {
    togglePickBtn.classList.remove('active');
    pickerTitle.textContent = 'Inspect Element';
    pickerDesc.textContent = 'Click here and hover over elements';
    statusBadge.classList.remove('active');
    if (statusText) statusText.textContent = 'Ready';
  }
}

function handleMouseOver(e) {
  if (!isPicking) return;
  if (widgetContainerEl && widgetContainerEl.contains(e.target)) {
    updateOverlay(null);
    return;
  }
  if (e.target.id === 'uniq-selector-overlay') return;
  hoveredElement = e.target;
  updateOverlay(hoveredElement);
}

function handleMouseOut(e) {
  if (!isPicking) return;
  if (e.target === hoveredElement) {
    hoveredElement = null;
    updateOverlay(null);
  }
}

function handleClick(e) {
  if (!isPicking) return;
  if (widgetContainerEl && widgetContainerEl.contains(e.target)) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();

  const target = e.target;
  if (target.id === 'uniq-selector-overlay') return;

  const result = generateUniqueSelector(target);

  navigator.clipboard.writeText(result.selector).catch(err => {
    console.warn('Failed to copy to clipboard: ', err);
  });

  try {
    chrome.runtime.sendMessage({
      action: 'element-selected',
      data: {
        selector: result.selector,
        type: result.type,
        verifiedUnique: result.verifiedUnique,
        tagName: target.tagName.toLowerCase(),
        timestamp: Date.now()
      }
    });
  } catch (err) {
  }

  stopPicking();
}

function startPicking() {
  if (isPicking) return;
  isPicking = true;
  createOverlay();
  createWidget();
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.documentElement.style.cursor = 'crosshair';
}

function stopPicking() {
  if (!isPicking) return;
  isPicking = false;
  removeOverlay();
  removeWidget();
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  document.documentElement.style.cursor = '';
  
  try {
    chrome.runtime.sendMessage({ action: 'picking-stopped' });
  } catch (err) {
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start-picking') {
    startPicking();
    sendResponse({ success: true });
  } else if (message.action === 'stop-picking') {
    stopPicking();
    sendResponse({ success: true });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.isPicking) {
      if (changes.isPicking.newValue) {
        startPicking();
      } else {
        stopPicking();
      }
    }
    if (changes.lastResult) {
      updateWidgetResult(changes.lastResult.newValue);
    }
    if (changes.history) {
      updateWidgetHistory(changes.history.newValue);
    }
  }
});
