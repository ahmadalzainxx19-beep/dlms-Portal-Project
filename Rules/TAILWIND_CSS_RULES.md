# Tailwind CSS Rules & Guidelines

## Overview
This project uses **Tailwind CSS exclusively**. Bootstrap classes are **NOT allowed** and must be replaced with Tailwind CSS equivalents.

## Custom Tailwind Classes
The following custom classes are defined in `wwwroot/css/styles.css` and should be used:

### Buttons
- `.btn-primary` - Primary button (green background)
- `.btn-accent` - Accent button (gold background)

**Note**: Outline buttons should use Tailwind CSS border utilities instead of custom classes:
- Primary outline: `border-2 border-primary text-primary bg-transparent hover:bg-primary/10`
- Secondary outline: `border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700`
- Warning outline: `border-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-transparent hover:bg-yellow-50 dark:hover:bg-yellow-900/20`
- Danger outline: `border-2 border-red-500 text-red-600 dark:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20`

### Cards & Containers
- `.card-bg` - Card background (adapts to theme)
- `.border-custom` - Custom border color (adapts to theme)

### Text & Colors
- `.text-muted` - Muted text color (adapts to theme)
- `.icon-primary` - Primary icon color
- `.icon-accent` - Accent icon color

## Bootstrap to Tailwind Migration Guide

### Grid System
| Bootstrap | Tailwind CSS |
|-----------|--------------|
| `row` | `flex flex-wrap` or `grid grid-cols-*` |
| `col-md-6` | `md:col-span-6` (in grid) or `md:w-1/2` (in flex) |
| `col-md-8` | `md:col-span-8` (in grid) or `md:w-2/3` (in flex) |
| `col-md-12` | `md:col-span-12` (in grid) or `w-full` (in flex) |

### Cards
| Bootstrap | Tailwind CSS |
|-----------|--------------|
| `card` | `card-bg rounded-xl shadow-lg border border-custom` |
| `card-header` | `p-6 border-b border-custom` |
| `card-body` | `p-6` |
| `card-title` | `text-lg font-semibold` |

### Buttons
| Bootstrap | Tailwind CSS |
|-----------|--------------|
| `btn btn-primary` | `btn-primary px-6 py-2 rounded-lg font-medium text-white transition duration-150 hover:opacity-90` |
| `btn btn-secondary` | `border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition duration-150` |
| `btn btn-success` | `btn-primary` (or custom success variant) |
| `btn btn-danger` | `border-2 border-red-500 text-red-600 dark:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 px-6 py-2 rounded-lg font-medium transition duration-150` |
| `btn btn-warning` | `border-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-transparent hover:bg-yellow-50 dark:hover:bg-yellow-900/20 px-6 py-2 rounded-lg font-medium transition duration-150` |
| `btn-outline-primary` | `border-2 border-primary text-primary bg-transparent hover:bg-primary/10 px-6 py-2 rounded-lg font-medium transition duration-150` |
| `btn-outline-secondary` | `border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition duration-150` |
| `btn-outline-warning` | `border-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-transparent hover:bg-yellow-50 dark:hover:bg-yellow-900/20 px-6 py-2 rounded-lg font-medium transition duration-150` |
| `btn-outline-danger` | `border-2 border-red-500 text-red-600 dark:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 px-6 py-2 rounded-lg font-medium transition duration-150` |

### Forms
| Bootstrap | Tailwind CSS |
|-----------|--------------|
| `form-control` | `w-full px-4 py-2 border border-custom rounded-lg bg-card-bg text-base focus:outline-none focus:ring-2 focus:ring-primary` |
| `form-label` | `block text-sm font-medium mb-2` |
| `form-control-plaintext` | `text-base` |
| `is-invalid` | `border-red-500` or custom error styling |
| `invalid-feedback` | `text-red-500 text-sm mt-1` |

### Alerts
| Bootstrap | Tailwind CSS |
|-----------|--------------|
| `alert alert-warning` | `p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg` |
| `alert alert-success` | `p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg` |
| `alert alert-danger` | `p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg` |
| `alert alert-info` | `p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg` |

### Badges
| Bootstrap | Tailwind CSS |
|-----------|--------------|
| `badge bg-success` | `px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200` |
| `badge bg-warning` | `px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200` |
| `badge bg-danger` | `px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200` |

### Tables
| Bootstrap | Tailwind CSS |
|-----------|--------------|
| `table` | `w-full` |
| `thead` | `bg-gray-50 dark:bg-gray-800 border-b border-custom` |
| `th` | `px-6 py-3 text-right font-semibold uppercase tracking-wider` (or `font-bold` for emphasis) |
| `tbody` | `divide-y divide-custom` |
| `tr` | `card-bg hover:bg-primary/5 dark:hover:bg-primary/10 transition duration-150` |

**Important**: Table headers (`<th>`) should **NOT** include `text-xs` or `text-muted` classes. Use only `font-semibold` (or `font-bold` for emphasis) with `uppercase tracking-wider` for styling.

### Utilities
| Bootstrap | Tailwind CSS |
|-----------|--------------|
| `fw-bold` | `font-bold` |
| `mb-3` | `mb-3` (same in Tailwind) |
| `mb-0` | `mb-0` (same in Tailwind) |
| `mt-4` | `mt-4` (same in Tailwind) |
| `ms-2` | `ms-2` (same in Tailwind - logical property) |
| `d-flex` | `flex` |
| `justify-content-end` | `justify-end` |
| `gap-2` | `gap-2` (same in Tailwind) |
| `container` | `max-w-7xl mx-auto` or remove if not needed |

### Icons
| Bootstrap/Font Awesome | Tailwind CSS (Feather Icons) |
|------------------------|------------------------------|
| `fas fa-*` | `data-feather="*"` (use Feather icon names) |
| `fa-info-circle` | `data-feather="info"` |
| `fa-arrow-left` | `data-feather="arrow-right"` (RTL) |
| `fa-edit` | `data-feather="edit-3"` |
| `fa-exclamation-triangle` | `data-feather="alert-triangle"` |
| `fa-times` | `data-feather="x"` |
| `fa-save` | `data-feather="save"` |

**Important**: Always call `feather.replace()` in the Scripts section to render Feather icons.

## RTL Support
- Use logical properties: `me-*` (margin-end), `ms-*` (margin-start), `ps-*` (padding-start), `pe-*` (padding-end)
- Avoid directional properties: `ml-*`, `mr-*`, `pl-*`, `pr-*`
- Use `rtl:rotate-0 ltr:rotate-180` for directional icons

## Dark Mode Support
- Always include dark mode variants: `dark:bg-*`, `dark:text-*`, `dark:border-*`
- Use theme-aware custom classes: `.card-bg`, `.border-custom`, `.text-muted`

## Bilingual Support
- All text elements MUST have `data-ar` and `data-en` attributes
- Use spans with bilingual attributes for dynamic text

## Examples

### Card with Header
```html
<div class="card-bg rounded-xl shadow-lg border border-custom">
    <div class="p-6 border-b border-custom">
        <h3 class="text-lg font-semibold">Title</h3>
    </div>
    <div class="p-6">
        Content here
    </div>
</div>
```

### Form Input
```html
<label class="block text-sm font-medium mb-2">Label</label>
<input type="text" 
       class="w-full px-4 py-2 border border-custom rounded-lg bg-card-bg text-base focus:outline-none focus:ring-2 focus:ring-primary" />
```

### Button
```html
<!-- Primary button -->
<button class="btn-primary px-6 py-2 rounded-lg font-medium text-white transition duration-150 hover:opacity-90">
    Click Me
</button>

<!-- Outline button (Primary) -->
<button class="border-2 border-primary text-primary bg-transparent hover:bg-primary/10 px-6 py-2 rounded-lg font-medium transition duration-150">
    Outline Button
</button>

<!-- Outline button (Secondary) -->
<button class="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition duration-150">
    Secondary
</button>
```

### Status Badge
```html
<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
    Active
</span>
```

## Rules for Future Development
1. **NEVER use Bootstrap classes** - Always use Tailwind CSS
2. **Use custom classes** from `styles.css` when available (`.btn-primary`, `.card-bg`, etc.)
3. **Always include dark mode variants** for colors and backgrounds
4. **Use logical properties** for RTL support (`me-*`, `ms-*`, `ps-*`, `pe-*`)
5. **Use Feather Icons** instead of Font Awesome (`data-feather="icon-name"`)
6. **Include bilingual attributes** (`data-ar`, `data-en`) on all text elements
7. **Follow existing patterns** from updated views (Semester, Calendar, Permissions)
