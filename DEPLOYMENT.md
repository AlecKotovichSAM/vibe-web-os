# GitHub Pages Deployment Guide

## Quick Start

### 1. Create GitHub Repository

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/web-os.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll to **Pages** section (left sidebar)
4. Under **Source**, select:
   - **Branch**: `main` (or `master`)
   - **Folder**: `/ (root)`
5. Click **Save**
6. Wait 1-2 minutes for initial deployment

**✅ Automatic Deployment**: Once enabled, GitHub Pages will **automatically redeploy** on every commit you push to the `main` branch. No manual steps needed!

### 3. Access Your Web OS

Your Web OS will be available at:
```
https://YOUR_USERNAME.github.io/web-os/
```

(Replace `YOUR_USERNAME` with your GitHub username and `web-os` with your repository name)

## Important Notes

### ✅ What Works Automatically

- **HTTPS**: GitHub Pages provides HTTPS automatically (required for Service Workers)
- **Static Files**: All your HTML/CSS/JS files will be served correctly
- **Service Worker**: Will work because HTTPS is enabled
- **localStorage**: Each user gets their own isolated storage
- **Auto-updates**: Push changes to GitHub, and they'll be live in ~1-2 minutes

### 📝 Considerations

1. **Repository Visibility**:
   - **Public repo**: Anyone can see your code and use the Web OS
   - **Private repo**: Only you can see the code, but the Pages site is still public (if enabled)

2. **Custom Domain** (Optional):
   - You can use your own domain (e.g., `webos.yourdomain.com`)
   - Add a `CNAME` file in the root with your domain name
   - Configure DNS records on your domain provider

3. **Path Considerations**:
   - If your repo is named `web-os`, the URL will be `/web-os/`
   - If you want it at the root (`/`), name your repo `YOUR_USERNAME.github.io`

## File Structure

Your project structure is already perfect for GitHub Pages:
```
web-os/
├── index.html          ✅ Entry point
├── css/
│   └── os.css
├── js/
│   └── *.js
└── sw.js               ✅ Service Worker (works with HTTPS)
```

## Testing After Deployment

1. Visit your GitHub Pages URL
2. Open DevTools → Application → Service Workers
3. Verify Service Worker is registered
4. Test offline mode (DevTools → Network → Offline)
5. Test localStorage (each browser gets isolated storage)

## Updating Your Site (Automatic Deployment)

**GitHub Pages automatically redeploys on every commit to the `main` branch!**

Simply push changes to GitHub:

```bash
git add .
git commit -m "Update description"
git push
```

**What happens:**
1. GitHub detects the push to `main`
2. Automatically triggers a new deployment
3. Your site updates in 1-2 minutes
4. No manual steps required!

### Monitoring Deployments

You can monitor deployment status:

1. **GitHub Actions Tab**: 
   - Go to your repository → **Actions** tab
   - See deployment status and logs
   - Green checkmark = successful deployment

2. **Pages Settings**:
   - Settings → Pages
   - See "Your site is live at..." with last deployment time

3. **Email Notifications** (optional):
   - GitHub will email you if deployment fails
   - Configure in Settings → Notifications

## Troubleshooting

### Service Worker Not Working
- Ensure you're accessing via HTTPS (GitHub Pages provides this automatically)
- Clear browser cache and hard refresh (Ctrl+Shift+R)

### Files Not Loading
- Check that all file paths are relative (they are in your project ✅)
- Verify file names match exactly (case-sensitive)

### 404 Errors
- Make sure `index.html` is in the root directory ✅
- Check repository Settings → Pages to ensure it's enabled

## Alternative: Deploy from `/docs` Folder

If you prefer to keep source files separate:

1. Create a `docs` folder
2. Copy all files to `docs/`
3. In GitHub Pages settings, select `/docs` folder instead of root
4. Your site will still work the same way
