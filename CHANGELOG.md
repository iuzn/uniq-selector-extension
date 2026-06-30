# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-06-30

### Added
- **Core Selector Engine**: High-performance strategy matrix for resolving stable, unique CSS Paths and fallback hierarchical XPaths.
- **Interactive Highlighter**: Custom absolute-positioned overlay (`#uniq-selector-overlay`) with hardware-accelerated transitions to highlight hovered elements on target pages.
- **Shadow DOM Floating Widget**: Complete replica of the popup interface injected directly into the target webpage DOM for an in-context inspection workflow.
- **Styles & Isolation**: Fully isolated styling inside the Shadow DOM by dynamically injecting `popup.css`, preventing styles from leaking or being overwritten by host page stylesheet rule declarations.
- **Bi-directional Sync**: Implemented `chrome.storage.onChanged` listeners to sync state, history entries, and last selector updates in real-time between the extension popup and page-injected widget.
- **Auto-Dismiss popup**: Configured popup window to close immediately (`window.close()`) upon initiating inspection to avoid blocking view.
- **Web Accessible Resources**: Registered eklenti icons and `popup.css` inside `manifest.json` under Manifest V3 specifications to allow page content script fetch access.
- **New Vector Branding**: Designed official `icon.svg` using solid `#FF3D00` background and white cursor/star vector shapes, and set up icon compiler utilizing `sharp` to build production sizes (16px, 32px, 48px, 128px).
- **Clipboard Management**: Custom toast notifications for one-click selector copy actions (both for last result and history items).
- **Selector History**: Caches and displays up to 50 recently resolved selectors with clear-all functionality.
- **Project Documentation**: Added comprehensive `README.md` and developer `handoff.md` guidelines, with absolute local path references fully cleaned for public publishing.

### Changed
- Migrated branding colors from old green/teal highlights to modern sky-blue accents (`#0ea5e9` / `rgba(14, 165, 233, ...)`).
- Replaced custom inspect icons in the popup and widget button panels with a clean stroke-based outline cursor SVG.
- Standardized project name conventions to `Uniq Selector` across manifest, headers, page footer displays, and package.json configurations.
- Flattened git commit history into an uncommitted, fresh state to prepare for pristine initial repository check-in.
