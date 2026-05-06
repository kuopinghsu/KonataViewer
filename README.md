# Konata Viewer

![Konata Viewer example](konata.svg)

A standalone, single-file HTML viewer for [Onikiri2-Konata](https://github.com/shioyadan/Konata) pipeline trace files (`.kanata`).

No server, no build step, no dependencies — just open `KonataViewer.html` in a browser.

---

## Usage

```
# Open directly in a browser
xdg-open KonataViewer.html          # Linux
open KonataViewer.html              # macOS
start KonataViewer.html             # Windows
```

Then use the **📁 Open** button (or **Ctrl+O**) to load a `.kanata` trace file.

---

## Features

| Feature | Description |
|---|---|
| **Gradient stage rendering** | Pipeline stages rendered with official Konata gradient colouring |
| **Per-cycle stall numbers** | Stall count labels on each cycle cell, matching the official viewer |
| **Lane splitting** | Expand each superscalar lane into its own sub-row (⬍ Split Lanes) |
| **Anchor mode** | Lock a selected instruction to the horizontal centre while scrolling vertically |
| **Bookmarks** | Save named positions and jump back with one click |
| **Find** | Search instructions by name or ID |
| **Minimap** | Overview panel on the right with a live viewport indicator |
| **Export SVG** | Export the current view as a self-contained SVG file |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+O` | Open file |
| `Ctrl+F` | Find instruction |
| `Ctrl+B` | Add bookmark |
| `+` / `-` | Zoom in / out |
| `F` | Fit visible rows to window height |
| `Escape` | Clear selection |
| `Ctrl+Scroll` | Zoom |
| `Shift+Scroll` | Pan horizontally |

---

## Trace Format

Supports `.kanata` files produced by [Onikiri2](https://github.com/shioyadan/onikiri2) or any compatible simulator.  
Format specification: <https://github.com/shioyadan/Konata>
