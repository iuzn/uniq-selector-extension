# Uniq Selector - Project Handoff Document

This document serves as a comprehensive developer handoff, detailing the architecture, design choices, selection logic, and directories of the **Uniq Selector** Chrome Extension.

---

## 1. Project Overview & Objective

**Uniq Selector** is a high-performance, developer-focused Chrome Extension (Manifest V3) designed to generate **unique, self-verifying element selectors** (CSS Paths and XPath) on any live webpage. 

### Core Value Proposition
- **Guaranteed Uniqueness**: Every generated selector is instantly verified against the page's current DOM tree. If the selector matches more than one element, the engine automatically walks up the hierarchy to generate a more specific, unique path.
- **Heuristic Token Validation**: Automatically skips dynamic or auto-generated classes and IDs (e.g., hash-like tokens common in Tailwind, CSS Modules, or dynamic component frameworks) to ensure generated selectors remain stable over time.
- **Premium User Experience**: Designed using a dark-mode first, soft neutral-gray palette, creating a filmic, high-end feel in line with modern 2026 aesthetics.

---

## 2. Directory Structure

To keep the runtime code decoupled from development scripts and assets, the workspace is structured as follows:

```text
uniq-selector-extension/
├── build/                       # <-- The runnable Chrome Extension folder
│   ├── icons/                   # Generated PNG icon assets (16x16, 32x32, 48x48, 128x128)
│   ├── background.js            # Service worker orchestrating state
│   ├── content.js               # Visual overlay and selector generation script
│   ├── popup.html               # Extension popup layout
│   ├── popup.css                # Custom cinematic dark-mode styles
│   └── popup.js                 # Popup event handlers, messaging, and history storage
├── Docs/
│   └── handoff.md               # <-- This handoff document
├── node_modules/                # Dev dependencies installed via Bun
├── bun.lock                     # Bun lockfile
├── generate_icons.js            # Node/Bun script utilizing sharp to build PNG icons from SVG
├── icon.svg                     # Source SVG vector logo
└── package.json                 # Dev scripts and dependency list
```

---

## 3. Selector Generation Engine

The core selector generation logic is located in [build/content.js](../build/content.js). It evaluates selectors based on five sequential strategies:

### Token Stability Rules
Before using an ID or Class Name, the engine validates it using:
- **`STABLE_ID_REGEX`**: Checks if the token conforms to alphanumeric/dash sequences.
- **`DYNAMIC_TOKEN_REGEX`**: Filters out tokens with 5 or more consecutive numbers, identifying them as auto-generated hashes (e.g., `button_12894`, `css-12a839f`).
- **Length Constraint**: Tokens longer than 50 characters are skipped.

### The 5 Strategies
1. **Stable & Unique ID Check**: If the target has a stable ID, it tests `#id`. If unique, it returns it instantly.
2. **Unique Attributes**: Checks for test-oriented attributes in the following order of priority:
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
5. **Fallback XPath Hierarchy**: If all CSS path logic fails, it generates an absolute XPath sequence (e.g., `/html/body/div[2]/main/button[1]`) and marks the result status.

---

## 4. Visual Inspector & Floating Widget Overlay

When "Inspect Element" is activated:
- A custom absolute-positioned `div#uniq-selector-overlay` is injected into the target page to highlight hovered elements.
  - **CSS Properties**:
    - `pointer-events: none` prevents the overlay from intercepting hover/click events meant for page elements.
    - Hardware-accelerated CSS transition curves (`all 0.08s cubic-bezier(0.16, 1, 0.3, 1)`) are used to animate the highlight border as it moves from element to element.
- A replica of the popup UI (`div#uniq-selector-widget-container`) is injected into the webpage inside an encapsulated **Shadow DOM** at the bottom-right corner.
  - **Styles & Isolation**: The widget fetches and injects `popup.css` dynamically. The Shadow DOM completely encapsulates the widget styles, preventing leakage from or to the host webpage.
  - **Live State Sync**: Uses `chrome.storage.onChanged` to synchronize history, state (ready/inspecting), and the last selected element between the active extension popup and the injected page widget.
  - **Pointer Interactions**: Excludes the widget container from highlight overlays and selector click interception, allowing native button clicks (toggling inspection, clearing history, copying) directly on the floating page widget.
- When a webpage element is clicked, the click event is intercepted via capture listeners (`e.preventDefault()`, `e.stopPropagation()`). The selector is generated, copied to the clipboard, saved to local history, and the inspector automatically shuts down (removing both the overlay and the floating widget).

---

## 5. Design Guidelines & Custom Styling

The styling rules defined in [build/popup.css](../build/popup.css) adhere to strict cinematic design tokens:

- **Surface Palettes**:
  - Base background: `#0c0d0e` (Deep charcoal)
  - Card/container background: `#121315` and `#181a1d`
- **Soft Contrast Borders**:
  - Standard borders use `#24272c` (equivalent to a subtle 200-level gray).
- **Subtle Hovers**:
  - Hover states on lists and buttons transition to `#1f2227` (100-level gray hover effect) instead of high-contrast whites.
- **Blue Accents**:
  - Brand highlights use sky blue `#0ea5e9` with soft background glows (`rgba(14, 165, 233, 0.15)`).
- **Typography**:
  - Primary font: **Inter** from Google Fonts (soft, humanistic sans-serif).
  - Code displays: **JetBrains Mono** (optimized for readability of long, nested selectors).

---

## 6. How to Run, Build, and Deploy

### Dependency Setup
Ensure [Bun](https://bun.sh) is installed on your local machine.
To install dev dependencies (specifically `sharp` for SVG scaling):
```bash
bun install
```

### SVG Icon Generation
If the source vector logo `icon.svg` is modified, regenerate the production extension PNG icons by running:
```bash
bun run generate-icons
```
This writes the resized files into `build/icons/`.

### Loading into Google Chrome
1. Open Google Chrome.
2. Go to URL: `chrome://extensions/`
3. Toggle the **Developer mode** switch in the top-right.
4. Click **Load unpacked** in the top-left.
5. Choose the **`build/`** subdirectory inside the project:
   `📂 uniq-selector-extension/build`

---

## 7. Future Enhancements & Integration Points

- **Figma Workspace Integration**: Integrate with the Figma MCP server to export generated selectors directly into developer design specs.
- **Configurable Attribute Priorities**: Allow users to reorder which attributes (e.g. `data-testid`, `id`, `class`) the engine inspects first.
- **IFrame Inspection**: Extend content script injection to nested frames to enable multi-frame selector resolution.
