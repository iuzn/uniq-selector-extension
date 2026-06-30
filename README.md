<table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: none; margin-bottom: 24px;">
  <tr style="border: none;">
    <td width="96" valign="middle" style="border: none; padding: 0;">
      <img src="icon.svg" alt="Uniq Selector Logo" width="80" height="80" style="border-radius: 18px; display: block;" />
    </td>
    <td valign="middle" style="border: none; padding: 0 0 0 16px;">
      <h1 style="margin: 0; border-bottom: none; font-size: 2.2em; font-weight: 800; color: #1e293b;">Uniq Selector</h1>
      <p style="margin: 4px 0 0 0; color: #64748b; font-size: 1.1em; line-height: 1.4;">Premium Chrome Extension to generate unique CSS and XPath selectors with interactive visual inspector.</p>
    </td>
  </tr>
</table>

---

**Uniq Selector** is a high-performance, developer-focused Chrome Extension (Manifest V3) designed to generate **unique, self-verifying element selectors** (CSS Paths and XPath) on any live webpage. It combines robust element matching heuristics with a modern, cinematic dark-mode UI.

---

## ✨ Key Features

- **Guaranteed Uniqueness**: Every selector is verified in real-time against the page's current DOM. If a selector matches more than one element, the engine walks up the DOM hierarchy to generate a unique, specific path.
- **Smart Token Filters**: Automatically filters out dynamic, hashed, or auto-generated classes and IDs (common in frameworks like Tailwind, CSS Modules, or React) to keep selectors stable over time.
- **Dual Interactive UI**:
  - **Extension Popup**: Clean popup area for configuration and history overview.
  - **Injected Page Widget**: An exact replica of the popup UI injected directly into the webpage's DOM inside an encapsulated **Shadow DOM** for a seamless, floating inspector workspace.
- **Isomorphic Real-Time Sync**: Uses `chrome.storage.onChanged` to synchronize history, status (ready/inspecting), and the last selected element between the active popup and the enjected page widget.
- **One-Click Actions**: Instant copying to the clipboard with toast feedback for both the last generated selector and history items.
- **Selector History**: Maintains a history list of up to 50 items which can be cleared or copied individually.

---

## 📂 Directory Structure

```text
uniq-selector-extension/
├── build/                       # <-- The runnable Chrome Extension folder
│   ├── icons/                   # Generated PNG icon assets (16x16, 32x32, 48x48, 128x128)
│   ├── background.js            # Background service worker managing state and history
│   ├── content.js               # Page-injected inspector, highlighter, and Shadow DOM widget
│   ├── popup.html               # Extension popup layout
│   ├── popup.css                # Custom cinematic dark-mode styles (shared with widget)
│   └── popup.js                 # Popup event handlers, message passing, and auto-dismiss
├── docs/
│   └── handoff.md               # Developer handoff and technical design notes
├── node_modules/                # Dev dependencies installed via Bun
├── bun.lock                     # Bun lockfile
├── generate_icons.js            # Node/Bun script utilizing sharp to build PNG icons from SVG
├── icon.svg                     # Source SVG vector logo (FF3D00 background with white symbol)
└── package.json                 # Dev scripts and dependency list
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure [Bun](https://bun.sh) is installed on your local machine.

### 2. Setup Dependencies
To install the dev dependencies (used to scale and generate PNG icons from the source SVG):
```bash
bun install
```

### 3. Generate PNG Icons
If the source vector logo `icon.svg` is modified, regenerate the production extension PNG icons by running:
```bash
bun run generate-icons
```
This writes the resized files into `build/icons/`.

### 4. Load the Extension into Google Chrome
1. Open Google Chrome.
2. Go to the URL: `chrome://extensions/`
3. Toggle the **Developer mode** switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Choose the **`build/`** subdirectory inside this project:
   `📂 uniq-selector-extension/build`

---

## 🛠 Technical Architecture

### Selector Resolution Engine
The core selector generation logic is located in [build/content.js](./build/content.js). It evaluates selectors based on five sequential strategies:
1. **Stable & Unique ID Check**: If the target has a stable ID, it tests `#id`. If unique, it returns it instantly.
2. **Unique Attributes**: Checks for test-oriented attributes in priority order:
   - `data-testid`
   - `data-id`
   - `data-qa`
   - `data-cy`
   - `name`
   - `placeholder`
   If found and unique, it returns `[attribute="value"]` or `tag[attribute="value"]`.
3. **Stable Class Names**: Combines all stable class names of the element. If the resulting `.class1.class2` selector is unique, it returns it.
4. **Smart CSS Path**: If no single-level selector is unique, the engine walks up the DOM parent tree. At each level:
   - It appends stable IDs, classes, or test-attributes.
   - If there are siblings with the same tag, it adds a `:nth-of-type(index)` pseudo-class.
   - It tests the accumulated path at each step. The moment it detects a unique match, the loop terminates.
   - Dynamic class hashes are filtered out using stability regex rules.
5. **Fallback XPath Hierarchy**: If all CSS path logic fails, it generates an absolute XPath sequence (e.g., `/html/body/div[2]/main/button[1]`) and marks the result status.

### Shadow DOM Isolation
The page-injected floating widget replica uses a Shadow DOM:
- **Style Encapsulation**: Fetches `popup.css` via Chrome's web accessible resource API and injects it inside the shadow root. This ensures page styles never break the widget UI, and widget styles never pollute the host site.
- **Pointer Event Isolation**: Excludes the widget container from highlight overlays and click interception, allowing native interactions on the floating widget's buttons.

---

## 🎨 Design Guidelines

The styling rules defined in [build/popup.css](./build/popup.css) adhere to strict cinematic design tokens:

- **Surface Palettes**:
  - Base background: `#0c0d0e` (Deep charcoal)
  - Card/container background: `#121315` and `#181a1d`
- **Soft Contrast Borders**:
  - Standard borders use `#24272c` (equivalent to a subtle 200-level gray).
- **Subtle Hovers**:
  - Hover states on lists and buttons transition to `#1f2227` (100-level gray hover effect) instead of high-contrast whites.
- **Sky Blue Accents**:
  - Brand highlights use blue `#0ea5e9` with soft background glows (`rgba(14, 165, 233, 0.15)`).
- **Typography**:
  - Primary font: **Inter** from Google Fonts (soft, humanistic sans-serif).
  - Code displays: **JetBrains Mono** (optimized for readability of long, nested selectors).
