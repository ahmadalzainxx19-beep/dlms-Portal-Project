# Layout Standards & Spacing Guidelines

## Overview
This document defines the **unified layout structure and spacing standards** for all pages in the KAU Portal. All pages MUST follow these standards to maintain consistency across the application.

## Page Structure Template

### Standard Page Layout
Every page MUST follow this exact structure:

```html
<body class="h-full flex overflow-hidden">
    <!-- Sidebar -->
    <aside id="sidebar" class="sidebar w-64 flex-col hidden lg:flex h-full fixed lg:relative z-30">
        <!-- Sidebar content -->
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Header -->
        <header class="sticky top-0 z-20 card-bg border-b border-custom shadow-sm">
            <!-- Header content -->
        </header>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-y-auto main-content-full-width">
            <div class="w-full p-6">
                <!-- Page content goes here -->
            </div>
        </main>

        <!-- Footer -->
        <footer class="p-4 border-t border-custom text-center text-muted text-sm card-bg flex-shrink-0">
            <!-- Footer content -->
        </footer>
    </div>
</body>
```

## Critical Requirements

### 1. Main Content Wrapper
**REQUIRED**: All pages MUST have this wrapper inside `<main>`:
```html
<div class="w-full p-6">
    <!-- All page content -->
</div>
```

**Why**: 
- `w-full`: Ensures full width content
- `p-6`: Provides consistent 24px (1.5rem) padding on all sides
- Creates uniform spacing across all pages

### 2. Main Tag Classes
**REQUIRED**: The `<main>` tag MUST have these classes:
```html
<main class="flex-1 overflow-y-auto main-content-full-width">
```

**Why**:
- `flex-1`: Allows main to grow and fill available space
- `overflow-y-auto`: Enables vertical scrolling when content exceeds viewport
- `main-content-full-width`: Custom class for full-width layout (defined in `assets/styles.css`)

### 3. Footer Position
**REQUIRED**: Footer MUST be outside `<main>` and include `flex-shrink-0`:
```html
<footer class="p-4 border-t border-custom text-center text-muted text-sm card-bg flex-shrink-0">
```

**Why**:
- `flex-shrink-0`: Prevents footer from shrinking
- Positioned outside `<main>` to ensure it stays at the bottom

## Spacing Standards

### Content Spacing
Use these consistent spacing values throughout all pages:

| Element Type | Spacing Class | Value | Usage |
|-------------|---------------|-------|-------|
| **Page Container** | `p-6` | 24px | Main content wrapper |
| **Card Sections** | `mb-6` | 24px | Space between card sections |
| **Card Padding** | `p-6` | 24px | Inside card content |
| **Card Header** | `p-6 border-b border-custom` | 24px | Card header padding |
| **Form Groups** | `gap-4` | 16px | Grid/flex gaps in forms |
| **Button Groups** | `gap-3` | 12px | Space between buttons |
| **Table Cells** | `px-6 py-3` | 24px horizontal, 12px vertical | Table cell padding |
| **Input Fields** | `px-4 py-2.5` | 16px horizontal, 10px vertical | Form input padding |
| **Badges** | `px-2.5 py-0.5` | 10px horizontal, 2px vertical | Badge padding |

### Grid Spacing
```html
<!-- Standard grid with consistent gaps -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <!-- Grid items -->
</div>
```

### Card Spacing
```html
<!-- Standard card with consistent spacing -->
<div class="card-bg rounded-xl shadow-lg border border-custom mb-6">
    <div class="p-6 border-b border-custom">
        <!-- Card header -->
    </div>
    <div class="p-6">
        <!-- Card content -->
    </div>
</div>
```

## Header Structure

### Standard Header
```html
<header class="sticky top-0 z-20 card-bg border-b border-custom shadow-sm">
    <div class="flex items-center justify-between px-6 py-4">
        <div class="flex items-center gap-4">
            <button id="sidebarToggle" class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <i data-feather="menu" class="w-5 h-5"></i>
            </button>
            <div>
                <h2 class="text-xl font-bold">Page Title</h2>
                <p class="text-sm text-muted">Page description (optional)</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <!-- Theme toggle, language toggle, user info -->
        </div>
    </div>
</header>
```

**Header Padding**: `px-6 py-4` (24px horizontal, 16px vertical)

## Sidebar Structure

### Standard Sidebar
```html
<aside id="sidebar" class="sidebar w-64 flex-col hidden lg:flex h-full fixed lg:relative z-30">
    <div class="h-20 flex items-center justify-center border-b border-white/10">
        <!-- Logo/Brand -->
    </div>
    <nav class="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <!-- Navigation links -->
    </nav>
    <div class="p-4 border-t border-white/10">
        <!-- Logout link -->
    </div>
</aside>
```

## Form Layout Standards

### Form Container
```html
<form id="formId">
    <!-- Card sections with mb-6 spacing -->
    <div class="card-bg rounded-xl shadow-lg border border-custom mb-6">
        <div class="p-6 border-b border-custom">
            <h3 class="font-bold text-lg">Section Title</h3>
        </div>
        <div class="p-6">
            <!-- Form fields with gap-4 in grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Form inputs -->
            </div>
        </div>
    </div>
</form>
```

## Table Layout Standards

### Standard Table
```html
<div class="overflow-x-auto">
    <table class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-800 border-b border-custom">
            <tr>
                <th class="px-6 py-3 text-right font-semibold uppercase tracking-wider">Column</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-custom">
            <tr class="card-bg hover:bg-primary/5 dark:hover:bg-primary/10 transition duration-150">
                <td class="px-6 py-4">Content</td>
            </tr>
        </tbody>
    </table>
</div>
```

**Table Cell Padding**: `px-6 py-4` for body cells, `px-6 py-3` for header cells

## Button Spacing

### Button Groups
```html
<div class="flex justify-end gap-3 mb-6">
    <button class="btn-primary px-6 py-2.5 rounded-lg">Primary</button>
    <button class="px-4 py-2.5 border border-gray-300 rounded-lg">Secondary</button>
</div>
```

**Button Padding**: 
- Primary buttons: `px-6 py-2.5`
- Secondary buttons: `px-4 py-2.5`
- Small buttons: `px-3 py-1.5`

## Alert/Info Box Spacing

### Standard Alert
```html
<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3 mb-6">
    <i data-feather="info" class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"></i>
    <div>
        <!-- Alert content -->
    </div>
</div>
```

**Alert Padding**: `p-4` (16px) with `mb-6` (24px) bottom margin

## Checklist for New Pages

When creating a new page, ensure:

- [ ] `<main>` tag has classes: `flex-1 overflow-y-auto main-content-full-width`
- [ ] Content wrapper inside `<main>` has: `<div class="w-full p-6">`
- [ ] Footer is outside `<main>` with `flex-shrink-0` class
- [ ] Header uses `px-6 py-4` padding
- [ ] Cards use `mb-6` for spacing between sections
- [ ] Card content uses `p-6` padding
- [ ] Forms use `gap-4` in grid layouts
- [ ] Buttons use `gap-3` in button groups
- [ ] Tables use `px-6 py-4` for body cells
- [ ] All spacing follows the standards table above

## Examples

### Complete Page Template
```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <!-- Head content -->
</head>
<body class="h-full flex overflow-hidden">
    <!-- Sidebar -->
    <aside id="sidebar" class="sidebar w-64 flex-col hidden lg:flex h-full fixed lg:relative z-30">
        <!-- Sidebar content -->
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Header -->
        <header class="sticky top-0 z-20 card-bg border-b border-custom shadow-sm">
            <div class="flex items-center justify-between px-6 py-4">
                <!-- Header content -->
            </div>
        </header>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-y-auto main-content-full-width">
            <div class="w-full p-6">
                <!-- Page content with consistent spacing -->
                <div class="card-bg rounded-xl shadow-lg border border-custom mb-6">
                    <div class="p-6 border-b border-custom">
                        <h3 class="font-bold text-lg">Title</h3>
                    </div>
                    <div class="p-6">
                        <!-- Content -->
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="p-4 border-t border-custom text-center text-muted text-sm card-bg flex-shrink-0">
            <!-- Footer content -->
        </footer>
    </div>
</body>
</html>
```

## Rules for Future Development

1. **ALWAYS** use `<div class="w-full p-6">` inside `<main>` for content wrapper
2. **ALWAYS** use `mb-6` for spacing between card sections
3. **ALWAYS** use `p-6` for card padding
4. **ALWAYS** use `gap-4` for grid/flex gaps in forms
5. **ALWAYS** use `gap-3` for button groups
6. **NEVER** add padding directly to `<main>` tag
7. **NEVER** use inconsistent spacing values (stick to the standards table)
8. **ALWAYS** position footer outside `<main>` with `flex-shrink-0`
9. **ALWAYS** follow the complete page template structure
10. **ALWAYS** verify spacing matches existing pages before committing

## Maintenance

When updating existing pages:
1. Check if they follow the standard structure
2. Update any pages that don't match the template
3. Ensure all spacing values match the standards table
4. Test responsive behavior on mobile, tablet, and desktop
5. Verify footer stays at bottom with limited content
