# Vibe Web OS

A browser-based operating system built with pure HTML, CSS, and JavaScript. Features a desktop environment with window management, virtual file system, and built-in apps.

🌐 **Live Demo:** [https://aleckotovichsam.github.io/vibe-web-os/](https://aleckotovichsam.github.io/vibe-web-os/)

## ✨ Features

### Desktop Environment
- **Taskbar** with start menu, window management, and system tray
- **Desktop icons** with double-click to open and right-click context menus
- **Window Manager** with drag, resize, minimize, maximize, and close functionality
- **Start Menu** with categorized apps and custom folders
- **Locale Switcher** supporting 10 languages (EN, DE, FR, ES, IT, PT, RU, JA, ZH, KO)
- **Clock & Date** display with locale-aware formatting

### Built-in Applications
- **📁 Files** - Virtual file system browser with folder creation, file management, image previews, and download support
- **📝 Notes** - Simple note-taking app with auto-save
- **📄 Text Editor** - Full-featured text editor with save/save-as functionality
- **⚙️ Settings** - System configuration (themes, wallpapers, storage management)
- **🔧 Task Manager** - View and manage running windows and processes (accessible via search)
- **💻 Terminal** - Command-line interface with file system commands
- **🧮 Calculator** - Scientific calculator app
- **🎨 Draw** - Drawing application with canvas support
- **📊 System Information** - Display system information and statistics
- **🌐 PageNotFound Explorer** - Humorous browser that always shows 404 pages (with 88+ funny messages!)
- **🎮 Games** - Games folder with Minesweeper

### System Features
- **Virtual File System** - Complete file/folder management stored in localStorage with type awareness
- **Custom Folders** - Create and organize custom application folders
- **Multiple Themes** - Dark, Light, Classic, and High Contrast themes
- **Custom Wallpapers** - Set custom wallpapers from files or URLs
- **Offline Support** - Service Worker for offline functionality
- **BSOD (Blue Screen of Death)** - Easter egg feature with random error screens
- **Full Internationalization** - Complete localization system with 10 languages and locale-aware formatting
- **Network Status** - Online/offline indicator in taskbar
- **Search** - Quick app search in taskbar
- **Grid/List Views** - Toggle between grid and list views with persistence

### Window Management
- Drag windows by titlebar
- Resize windows from corners/edges
- Minimize to taskbar
- Maximize/restore windows
- Close windows
- Focus management
- Window stacking

## 🚀 Quick Start

### Online
Visit the [live demo](https://aleckotovichsam.github.io/vibe-web-os/)

### Local Development

**Option 1: Direct Open**
```bash
# Simply open index.html in your browser
open index.html
```

**Option 2: Local Server**
```bash
# Python
python -m http.server 8000

# Node.js (with npx)
npx serve

# Then visit http://localhost:8000
```

## 🛠️ Tech Stack

- **Pure HTML/CSS/JavaScript** - No build system, no dependencies
- **localStorage** - For persistent data storage
- **Service Worker** - For offline support and caching
- **Modular Architecture** - Core modules (bus, fs, window, apps, shell)

## 📁 Project Structure

```
vibe-web-os/
├── index.html          # Main entry point
├── css/
│   └── os.css         # All styles and themes
├── js/
│   ├── core.*.js      # Core system modules
│   ├── apps.*.js       # Application modules
│   ├── games/          # Game modules
│   ├── boot.js         # Boot sequence
│   └── bsod.js         # BSOD feature
├── sw.js               # Service Worker
└── README.md
```

## 🎨 Themes

- **Dark** (default) - Modern dark theme
- **Light** - Clean light theme
- **Classic** - Classic blue theme
- **High Contrast** - Accessibility-focused theme

## 🌍 Locale Support

The system supports 10 languages with locale-aware date/time formatting:
- English (EN)
- Deutsch (DE)
- Français (FR)
- Español (ES)
- Italiano (IT)
- Português (PT)
- Русский (RU)
- 日本語 (JA)
- 中文 (ZH)
- 한국어 (KO)

## 🎮 Apps Overview

### Files
Browse and manage your virtual file system. Create folders, files, and organize documents. Features image previews for supported formats, grid/list view toggle, and file download capability.

### Notes
Simple note-taking application. Notes are automatically saved to localStorage.

### Text Editor
Full-featured text editor with save and save-as functionality. Create and edit text files in the virtual file system.

### Task Manager
View and manage all running windows and processes. Monitor system resources, switch between windows, and end tasks. Accessible via search (hidden from desktop and start menu).

### Terminal
Full command-line interface with file system commands: `ls`, `cd`, `mkdir`, `rm`, `cp`, `mv`, `cat`, `type`. Features command history and escape sequence support.

### Calculator
Scientific calculator app with basic arithmetic operations. Supports themes and localization.

### Draw
Drawing application with canvas support for creating simple drawings.

### System Information
Display system information including browser details, screen resolution, and other system statistics.

### Settings
Configure your Web OS:
- Change themes
- Set custom wallpapers
- Manage storage
- Reset file system

### PageNotFound Explorer
A humorous browser that always displays 404 pages with random funny messages. Every URL leads to nowhere - it's a feature, not a bug!

### Games
- **Minesweeper** - Classic puzzle game

## 🐛 BSOD Feature

The system includes a Blue Screen of Death easter egg that can be triggered randomly or manually. Features:
- Random error codes and messages
- Auto-recovery
- Configurable trigger intervals

## 📝 License

Free to use and modify. Have fun!

## 🎯 Version History

### Version 0.2 (Current)

**New Features:**
- 🔧 **Task Manager** - Manage running windows and processes
- 💻 **Terminal** - Full command-line interface with file system commands
- 🧮 **Calculator** - Scientific calculator app
- 🎨 **Draw App** - Drawing application
- 📊 **System Information** - System info display
- 🌐 **Network Indicator** - Online/offline status
- ⬇️ **Files Download** - Download files from virtual file system
- 🔍 **Search in Taskbar** - Quick app search
- 📅 **Date/Time Popup** - Clickable date/time display
- 🌍 **Full Internationalization** - 10 languages supported

**Improvements:**
- Unified double-click behavior across all folders
- Grid/List view toggle with persistence
- Enhanced UI responsiveness
- Improved theme support
- Better file system type awareness

**Bug Fixes:**
- Terminal command parsing fixes
- Light theme display issues
- Image viewer improvements
- Service Worker cache fixes
- Various UI and localization fixes

### Version 0.1

This is the first stable release of Vibe Web OS, featuring:
- Complete desktop environment
- Window management system
- Virtual file system
- Multiple built-in applications
- Theme support
- Locale switching
- Offline functionality
- BSOD easter egg

---

Made with ❤️ using pure web technologies
