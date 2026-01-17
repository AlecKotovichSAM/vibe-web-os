
# Coding Standards

## JavaScript
- ES modules only (`type="module"` scripts).
- `const`/`let`, no globals; import/export explicitly.
- Avoid direct DOM mutation inside loops; query once, then update.
- Delegate events at container level for dynamic lists.
- Document non-trivial functions with short JSDoc.

## CSS
- Organize into `base.css` (reset/vars), `layout.css` (structure), `components/*.css`.
- Use CSS variables in `:root` for colors/spacing; mobile-first media queries.
- Prefer BEM or clear kebab-case class names.

## HTML
- Semantic tags, accessible forms, `alt` text, and `loading="lazy"` where appropriate.
``
