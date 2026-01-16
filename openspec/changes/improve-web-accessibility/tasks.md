## 1. ESLint Configuration
- [x] 1.1 Add `eslint-plugin-jsx-a11y` to devDependencies
- [x] 1.2 Update `.eslintrc.json` to extend `plugin:jsx-a11y/recommended`
- [x] 1.3 Configure accessibility rules according to project needs

## 2. Component Accessibility Improvements
- [x] 2.1 Add aria-labels to icon-only buttons in `ProjectCard.tsx`
- [x] 2.2 Add aria-labels to form inputs in `ProjectForm.tsx` and `ModelForm.tsx`
- [x] 2.3 Ensure keyboard navigation works for `ExtractionStrategySelector.tsx`
- [x] 2.4 Add focus management for any modal/dialog components
- [x] 2.5 Add proper heading hierarchy to page components

## 3. Route Accessibility
- [x] 3.1 Add landmark regions (`<main>`, `<nav>`, `<header>`) to layouts
- [x] 3.2 Ensure "skip to content" link for keyboard users
- [x] 3.3 Verify focus is managed when routes change

## 4. Testing
- [x] 4.1 Run ESLint with a11y rules and fix all reported issues
- [ ] 4.2 Manual keyboard navigation testing of all pages
- [x] 4.3 Consider adding automated a11y testing (axe-core)
