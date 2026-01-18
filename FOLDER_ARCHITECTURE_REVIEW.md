# Folder Architecture Review

## ✅ IMPLEMENTED: Generic Folder System

The generic folder system has been implemented with the following components:

### 1. **Folder Storage System** (`js/core.folders.js`)
- ✅ Stores custom folders in localStorage (`webos.folders.v1`)
- ✅ Supports creating, updating, and deleting custom folders
- ✅ Auto-registers folders as apps for start menu integration
- ✅ Generic folder renderer that works with any app collection

### 2. **Games Folder** (Special System Folder)
- ✅ Remains as a specific app (`js/games/folder.js`)
- ✅ Not converted to generic system (as requested)
- ✅ Works alongside custom folders

### 3. **Start Menu Integration**
- ✅ Shows category folders (like Games)
- ✅ Shows custom user folders
- ✅ Filters out folder apps from uncategorized apps list

### 4. **Parent-Child Tracking**
- ✅ Works for both Games folder and custom folders
- ✅ Uses global `window.WindowRelations` Map
- ✅ Auto-restores parent folder when child app closes

## Usage Example

```javascript
// Create a custom folder
const folder = Folders.create({
  name: 'My Apps',
  icon: '📁',
  appIds: ['notes', 'editor', 'files']
});

// Open folder
Folders.open(folder.id);

// Update folder
Folders.update(folder.id, {
  name: 'My Favorite Apps',
  appIds: ['notes', 'editor']
});

// Delete folder
Folders.remove(folder.id);
```

## Previous Issues (Now Resolved)

### 1. **Hardcoded Games Folder**
- **Location**: `js/games/folder.js`
- **Issue**: Hardcoded to category 'games' and ID 'games-folder'
- **Impact**: Cannot create custom folders with different app collections

### 2. **Start Menu Hardcoding**
- **Location**: `js/core.shell.js` lines 40-46
- **Issue**: Only handles 'games' category, hardcoded folder app ID
- **Impact**: Custom folders won't appear in start menu

### 3. **No Folder Storage System**
- **Issue**: No way to persist custom folder configurations
- **Impact**: Custom folders can't be saved/loaded

### 4. **No Generic Folder App**
- **Issue**: Games folder is a specific app, not a generic folder renderer
- **Impact**: Each folder type needs its own app implementation

### 5. **Category-Only Approach**
- **Issue**: Folders are tied to app categories, not custom app collections
- **Impact**: Users can't create folders with arbitrary app combinations

## Proposed Architecture

### 1. **Folder Storage System**
```javascript
// Store in localStorage: 'webos.folders.v1'
{
  folders: [
    {
      id: 'games-folder',
      name: 'Games',
      icon: '🎮',
      type: 'category', // 'category' or 'custom'
      category: 'games', // if type is 'category'
      appIds: [] // if type is 'custom'
    },
    {
      id: 'my-folder-123',
      name: 'My Apps',
      icon: '📁',
      type: 'custom',
      appIds: ['notes', 'editor', 'files']
    }
  ]
}
```

### 2. **Generic Folder App**
Create `js/core.folder.js`:
- Generic folder renderer that works with any folder config
- Handles both category-based and custom folders
- Reusable for all folder types

### 3. **Folder Management API**
```javascript
Folders.create({ name, icon, appIds })
Folders.update(id, { name, icon, appIds })
Folders.delete(id)
Folders.list()
Folders.get(id)
Folders.open(id) // Opens folder window
```

### 4. **Start Menu Integration**
- Dynamically load folders from storage
- Support both category-based and custom folders
- Generate folder buttons dynamically

### 5. **Folder App Registration**
- Register folder apps dynamically based on stored configs
- Use pattern: `folder-{id}` for folder app IDs
- Generic launch function that reads folder config

## Migration Path

1. **Phase 1**: Create generic folder system alongside Games folder
2. **Phase 2**: Migrate Games folder to use generic system
3. **Phase 3**: Add folder management UI (create/edit/delete)
4. **Phase 4**: Remove hardcoded Games folder implementation

## Files to Create/Modify

### New Files:
- `js/core.folders.js` - Folder storage and management API
- `js/core.folder-app.js` - Generic folder app renderer

### Files to Modify:
- `js/core.shell.js` - Dynamic folder loading in start menu
- `js/games/folder.js` - Migrate to use generic system (or remove)
- `js/core.apps.js` - Support dynamic folder app registration

## Benefits

✅ Users can create custom folders with any app combination
✅ Folders persist across sessions
✅ Generic system works for all folder types
✅ Easy to add folder management UI later
✅ Backward compatible with category-based folders
