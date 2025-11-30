# UI Consistency - Code-Level Notes

## Button Component Usage

### Current State
The project has a well-designed `Button` component at `src/components/ui/button.tsx` with:
- Multiple variants (default, primary, secondary, destructive, success, warning, info, ghost, outline, accent)
- Size options (default, sm, lg, icon)
- Proper accessibility features (focus states, disabled states)

### Problem
Many components use raw `<button>` elements with inline Tailwind classes instead of the Button component.

### Examples

**✅ GOOD (Using Button component):**
```tsx
// src/components/AnaliticoDashboard.tsx
<Button onClick={handleImportExcel} className="ml-auto px-3 py-2 text-xs bg-gold-500...">
```

**❌ BAD (Raw button with inline styles):**
```tsx
// src/components/ReportFilters.tsx
<button onClick={() => onPeriodChange('Ano')} className={`flex-1 px-3 py-2 rounded-lg...`}>
```

### Refactoring Strategy

1. **Identify all raw buttons:**
   ```bash
   grep -r "<button" src/components --include="*.tsx" | grep -v "Button" | grep -v "buttonVariants"
   ```

2. **Create missing variants if needed:**
   - Add `variant="gold"` for gold buttons (currently using `bg-gold-500`)
   - Add `variant="graphite"` for graphite buttons

3. **Refactor pattern:**
   ```tsx
   // Before
   <button onClick={handler} className="px-3 py-2 rounded-lg bg-gold-500 text-white...">
     Label
   </button>
   
   // After
   <Button onClick={handler} variant="gold" size="sm">
     Label
   </Button>
   ```

### Files to Refactor (Priority Order)

1. **High Priority (User-facing, frequently used):**
   - `src/components/ReportFilters.tsx` - Filter buttons
   - `src/components/DREFullModal.tsx` - Export/Close buttons
   - `src/components/NOCTab.tsx` - Action buttons

2. **Medium Priority:**
   - `src/components/ui/dropdown.tsx` - Dropdown trigger
   - `src/components/ConfigModal.tsx` - Close button
   - `src/components/Sidebar.tsx` - Logout button

3. **Low Priority (Internal/Admin):**
   - Various modal close buttons
   - Internal utility buttons

---

## Spacing Consistency

### Current Issues

Different components use different spacing values for similar elements:

- **Cards:** `p-4`, `p-5`, `p-6` (inconsistent)
- **Buttons:** `px-3 py-2`, `px-4 py-2.5`, `px-2 py-0.5` (inconsistent)
- **Sections:** `mb-6`, `mb-8`, `mt-8` (inconsistent)

### Recommendation

Create a spacing scale document:

```typescript
// src/lib/spacing.ts (suggested)
export const spacing = {
  card: {
    padding: 'p-5',      // Standard card padding
    gap: 'gap-6',        // Standard gap between card elements
  },
  button: {
    default: 'px-4 py-2.5',  // Standard button padding
    small: 'px-3 py-2',      // Small button padding
    icon: 'p-2',              // Icon-only button
  },
  section: {
    marginBottom: 'mb-6',     // Standard section margin
    marginTop: 'mt-6',        // Standard top margin
  },
} as const;
```

Or use Tailwind's spacing scale consistently:
- `p-4` = 1rem (16px) - Standard padding
- `p-5` = 1.25rem (20px) - Larger padding
- `p-6` = 1.5rem (24px) - Extra large padding

---

## Typography Consistency

### Current State: ✅ Generally Good

- h1: `text-2xl` (24px) or `text-xl` (20px) - Consistent
- Body: `text-sm` (14px) or `text-xs` (12px) - Appropriate for dark theme
- Small text: `text-xs` (12px) - Consistent

### Minor Issues

Some components use inline `fontSize` styles:
```tsx
// Avoid
<div style={{ fontSize: '14px' }}>Text</div>

// Prefer
<div className="text-sm">Text</div>
```

---

## Filter Implementation Notes

### ReportFilters Component

**Current Implementation:**
- Period filter: ✅ Has handler, updates state
- Company filter: ✅ Has handler, updates state
- Group filter: ✅ Has handler, updates state
- Year filter: ⚠️ Optional handler
- Quarter filter: ⚠️ Optional handler
- Month filter: ⚠️ Optional handler
- Category filter: ⚠️ Optional handler (mock data)
- Department filter: ⚠️ Optional handler (mock data)

**Recommendation:**

1. **Remove unused filters** if they're not needed:
   ```tsx
   // If Category/Department are not used, remove them
   ```

2. **Or implement properly:**
   ```tsx
   // In ReportsPage.tsx
   useEffect(() => {
     // Reload data when any filter changes
     loadDreData();
   }, [selectedCompany, selectedPeriod, selectedYear, selectedMonth, selectedQuarter]);
   ```

3. **Add filter reset functionality:**
   ```tsx
   const resetFilters = () => {
     setSelectedPeriod('Ano');
     setSelectedYear(new Date().getFullYear().toString());
     setSelectedMonth('');
     setSelectedQuarter('');
   };
   ```

---

## Color Token Usage

### Current State

The app uses Tailwind's custom color palette:
- `graphite-*` - Main dark theme colors
- `gold-*` - Accent/primary actions
- `emerald-*` - Success/positive values
- `red-*` - Errors/negative values
- `blue-*` - Info/secondary actions

### Consistency: ✅ Good

Colors are used consistently across components.

### Recommendation

Document color usage:
- `gold-500` = Primary actions, highlights
- `emerald-400` = Positive values, success
- `red-400` = Negative values, errors
- `graphite-800` = Secondary backgrounds
- `graphite-900` = Main backgrounds

---

## Component Patterns

### Card Components

**Current:** Mix of:
- `card-premium` class (custom)
- `bg-[#1a1a2e]` (inline color)
- `bg-graphite-900` (Tailwind class)

**Recommendation:**
- Standardize on one pattern
- Create a `Card` component wrapper if needed
- Or document the `card-premium` class usage

### Modal Components

**Current:** Mix of:
- Radix UI Dialog (`@radix-ui/react-dialog`)
- Custom modal implementations
- Inline modal overlays

**Recommendation:**
- Standardize on Radix UI Dialog
- Create a shared `Modal` wrapper component
- Document modal usage patterns

---

## Accessibility Notes

### Current State

- ✅ Focus states on buttons (via Button component)
- ✅ Proper semantic HTML (mostly)
- ⚠️ Some buttons may lack ARIA labels
- ⚠️ Modal focus trap not verified

### Recommendations

1. Add ARIA labels to icon-only buttons:
   ```tsx
   <button aria-label="Close modal">
     <X className="w-4 h-4" />
   </button>
   ```

2. Ensure keyboard navigation works:
   - Tab order is logical
   - Enter/Space activate buttons
   - Escape closes modals

3. Add skip links for main content:
   ```tsx
   <a href="#main-content" className="sr-only focus:not-sr-only">
     Skip to main content
   </a>
   ```

---

## Testing Notes

### Automated Tests

- ✅ Playwright installed and configured
- ✅ Basic UI consistency tests created
- ⚠️ Login modal blocks full automation
- ⚠️ Manual testing needed for filters

### Manual Testing Checklist

- [ ] Login and verify all pages load
- [ ] Test all navigation links
- [ ] Test all filters on Reports page
- [ ] Verify filter reset functionality
- [ ] Test button clicks and interactions
- [ ] Check console for errors
- [ ] Verify empty states display correctly
- [ ] Test responsive layout on different screen sizes

---

## Next Steps

1. **Immediate:**
   - Manual testing of filters
   - Fix login modal for automated testing (optional)

2. **Short Term:**
   - Refactor button components
   - Standardize spacing
   - Complete filter implementation

3. **Long Term:**
   - Create design system documentation
   - Accessibility audit
   - Performance optimization

