# Changelog

All notable changes to Vibe Web OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-24

### Added
- **Task Manager** - New system app for managing running windows and processes
  - View all open windows with details (app name, title, window ID, status, size, memory)
  - Switch to or end tasks with action buttons
  - Sortable columns with manual resizing
  - System information panel (total windows, running/minimized counts, memory usage, uptime)
  - Auto-refresh every 5 seconds
  - Hidden from desktop and start menu (accessible via search)
- **Terminal** - Full command-line interface
  - File system commands: `ls`, `cd`, `mkdir`, `rm`, `cp`, `mv`, `cat`, `type`
  - Command history with arrow keys
  - Escape sequence support
  - Localized help text
- **Calculator** - Scientific calculator app
  - Basic arithmetic operations
  - Theme and localization support
- **Draw App** - Drawing application with canvas support
- **System Information** - System info display app
- **Network Indicator** - Online/offline status indicator in taskbar
- **Files Download** - Download files from virtual file system to local machine
- **Type-Aware File System** - Enhanced file system with desktop folder support
- **Search in Taskbar** - Search functionality in taskbar for quick app access
- **Date/Time Popup** - Clickable date/time display in taskbar
- **Grid/List View Toggle** - Toggle between grid and list views in Files and Games apps with per-path persistence
- **Internationalization (I18N)** - Full localization system
  - Support for 10 languages: English, Deutsch, Français, Español, Italiano, Português, Русский, 日本語, 中文, 한국어
  - Locale-aware date/time formatting
  - Translation keys system
  - Missing translations documentation

### Changed
- Unified double-click behavior across all folders (Files, Games, custom folders)
- Improved UI responsiveness with dynamic Start menu width
- Enhanced taskbar text truncation for long window names
- Improved view toggle icons and styling
- BSOD schedule updated to 600-1200 seconds (10-20 minutes)
- Service Worker cache improvements
- Terminal alignment and Start menu context menu fixes

### Fixed
- Terminal escape sequences and command parsing
- `ls` and `rm` command bugs
- Light theme display issues
- Image viewer closing functionality
- Minesweeper countdown stopping after winning
- Long filename handling and text overflow
- Rename input visibility (now uses white background with black text for better contrast)
- Localization and theme support issues across apps
- Service Worker cache issues

### Technical
- Code refactoring and organization improvements
- AGENTS.md documentation updates
- Removed .continue files
- Enhanced file system type awareness

## [0.1.0] - Initial Release

### Added
- Complete desktop environment with taskbar and start menu
- Window management system (drag, resize, minimize, maximize, close)
- Virtual file system with localStorage persistence
- Files app with folder creation and file management
- Notes app with auto-save
- Text Editor with save/save-as functionality
- Settings app for themes and wallpapers
- PageNotFound Explorer (humorous 404 browser)
- Minesweeper game
- Multiple themes (Dark, Light, Classic, High Contrast)
- Custom wallpaper support
- BSOD (Blue Screen of Death) easter egg
- Offline support via Service Worker
- Desktop icons with double-click and context menus
- Custom folders system

[0.2.0]: https://github.com/AlecKotovichSAM/vibe-web-os/compare/v0.1...v0.2.0
[0.1.0]: https://github.com/AlecKotovichSAM/vibe-web-os/releases/tag/v0.1
