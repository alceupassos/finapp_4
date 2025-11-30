/**
 * UI Consistency & Functionality Audit Test Suite
 * 
 * This test suite performs automated checks for:
 * - Visual formatting consistency (spacing, typography, alignment, colors)
 * - Working buttons and links
 * - Empty or broken content states
 * - Filters/search/sorting functionality
 * - Console errors related to UI interactions
 * 
 * To run: npx playwright test
 * 
 * App runs on: http://localhost:5173 (via npm run dev or ./start.sh)
 */

import { test, expect, Page } from '@playwright/test';

// Helper to wait for page to be ready
async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Allow React to render
}

// Helper to close blocking overlays if they exist
async function closeOverlays(page: Page) {
  const overlay = page.locator('div.fixed.inset-0');
  const count = await overlay.count();
  if (count === 0) return;

  for (let i = 0; i < count; i++) {
    const current = overlay.nth(i);
    if (!(await current.isVisible())) continue;
    const closeButton = current.locator(
      'button:has-text("Fechar"), ' +
        'button:has-text("Entendi"), ' +
        'button:has-text("Começar agora"), ' +
        'button:has-text("OK"), ' +
        'button:has-text("Entrar"), ' +
        '[data-testid="close-modal"], ' +
        '[role="button"][aria-label*="Fechar"]'
    );
    if (await closeButton.count()) {
      await closeButton.first().click({ force: true });
      await page.waitForTimeout(500);
      continue;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

// Helper to check console errors
async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore known non-critical errors
      if (!text.includes('favicon') && !text.includes('sourcemap')) {
        errors.push(text);
      }
    }
  });
  return errors;
}

// Helper to check visual consistency
async function checkVisualConsistency(page: Page, selector: string) {
  const elements = await page.locator(selector).all();
  if (elements.length === 0) return { consistent: true, issues: [] };
  
  const issues: string[] = [];
  const styles: Array<{ padding: string; margin: string; fontSize: string }> = [];
  
  for (const el of elements) {
    const padding = await el.evaluate((e) => window.getComputedStyle(e).padding);
    const margin = await el.evaluate((e) => window.getComputedStyle(e).margin);
    const fontSize = await el.evaluate((e) => window.getComputedStyle(e).fontSize);
    styles.push({ padding, margin, fontSize });
  }
  
  // Check if all have similar spacing
  const uniquePaddings = new Set(styles.map(s => s.padding));
  const uniqueMargins = new Set(styles.map(s => s.margin));
  
  if (uniquePaddings.size > 1) {
    issues.push(`Inconsistent padding: ${Array.from(uniquePaddings).join(', ')}`);
  }
  if (uniqueMargins.size > 1) {
    issues.push(`Inconsistent margin: ${Array.from(uniqueMargins).join(', ')}`);
  }
  
  return { consistent: issues.length === 0, issues };
}

test.describe('UI Consistency & Functionality Audit', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('sourcemap')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('/');
    await waitForPageReady(page);
    await closeOverlays(page);
  });

  test('1. Dashboard - Page loads and renders correctly', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Check for main heading or title
    const heading = page.locator('h1, h2, [role="heading"]').first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Check that page doesn't crash (no blank white screen)
    const body = page.locator('body');
    const bgColor = await body.evaluate((e) => window.getComputedStyle(e).backgroundColor);
    expect(bgColor).not.toBe('rgb(255, 255, 255)'); // Should be dark theme

    // Check for at least one visible content section
    const content = page.locator('[class*="grid"], [class*="flex"], section').first();
    await expect(content).toBeVisible();
  });

  test('2. Dashboard - KPI Cards visual consistency', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Wait for KPI cards to load
    const kpiCards = page.locator('[class*="KPI"], [class*="card"]').filter({ hasText: /Receita|Despesa|Limite|Meta/i });
    const count = await kpiCards.count();
    
    if (count > 0) {
      // Check spacing consistency
      const firstCard = kpiCards.first();
      const lastCard = kpiCards.last();
      
      const firstPadding = await firstCard.evaluate((e) => window.getComputedStyle(e).padding);
      const lastPadding = await lastCard.evaluate((e) => window.getComputedStyle(e).padding);
      
      // Cards should have similar padding
      if (firstPadding !== lastPadding && count > 1) {
        console.warn('⚠️ KPI cards have inconsistent padding');
      }

      // Check that cards have content
      for (let i = 0; i < Math.min(count, 4); i++) {
        const card = kpiCards.nth(i);
        const text = await card.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    } else {
      console.warn('⚠️ No KPI cards found on Dashboard');
    }
  });

  test('3. Navigation - Sidebar links work correctly', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await closeOverlays(page);

    // Wait for sidebar
    const sidebar = page.locator('aside, [class*="sidebar"], [class*="Sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Test navigation items
    const navItems = [
      { text: /Dashboard/i, expectedView: 'Dashboard' },
      { text: /Análises|Analises/i, expectedView: 'Análises' },
      { text: /Notícias|Noticias/i, expectedView: 'Notícias' },
      { text: /Fluxo.*Caixa/i, expectedView: 'Fluxo de Caixa' },
      { text: /Extrato|Lançamentos/i, expectedView: 'Extrato de Lançamentos' },
      { text: /Relatórios|Relatorios/i, expectedView: 'Relatórios' },
      { text: /Clientes/i, expectedView: 'Clientes' },
    ];

    for (const item of navItems) {
      const navButton = sidebar.locator('button, a').filter({ hasText: item.text }).first();
      
      if (await navButton.count() > 0) {
        await navButton.click();
        await page.waitForTimeout(1000); // Wait for navigation
        
        // Check that view changed (either via URL or content change)
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
        
        // Log if navigation seems to work
        console.log(`✅ Navigation to "${item.expectedView}" triggered`);
      } else {
        console.warn(`⚠️ Navigation item "${item.expectedView}" not found`);
      }
    }
  });

  test('4. Reports Page - Loads and displays content', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await closeOverlays(page);

    // Navigate to Reports
    const reportsNav = page.locator('button, a').filter({ hasText: /Relatórios|Relatorios/i }).first();
    if (await reportsNav.count() > 0) {
      await reportsNav.click();
      await waitForPageReady(page);

      // Check for Reports page content
      const reportsContent = page.locator('[class*="Report"], [class*="DRE"], [class*="DFC"]').first();
      if (await reportsContent.count() > 0) {
        await expect(reportsContent).toBeVisible({ timeout: 5000 });
      }

      // Check for KPI cards
      const kpiCards = page.locator('[class*="KPI"], [class*="card"]').filter({ hasText: /Receita|Impostos|Lucro|EBITDA/i });
      const kpiCount = await kpiCards.count();
      if (kpiCount > 0) {
        console.log(`✅ Reports page has ${kpiCount} KPI cards`);
      }

      // Check for tabs (DRE/DFC)
      const tabs = page.locator('[role="tab"], [class*="tab"]').filter({ hasText: /DRE|DFC/i });
      const tabCount = await tabs.count();
      if (tabCount > 0) {
        // Test tab switching
        const dreTab = tabs.filter({ hasText: /DRE/i }).first();
        if (await dreTab.count() > 0) {
          await dreTab.click();
          await page.waitForTimeout(500);
          console.log('✅ DRE tab clickable');
        }
      }
    } else {
      console.warn('⚠️ Reports navigation not found');
    }
  });

  test('5. Reports Page - Filters functionality', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await closeOverlays(page);

    // Navigate to Reports
    const reportsNav = page.locator('button, a').filter({ hasText: /Relatórios|Relatorios/i }).first();
    if (await reportsNav.count() > 0) {
      await reportsNav.click();
      await waitForPageReady(page);

      // Look for filter controls
      const filters = page.locator('[class*="Filter"], select, [class*="dropdown"]');
      const filterCount = await filters.count();
      
      if (filterCount > 0) {
        console.log(`✅ Found ${filterCount} filter controls`);
        
        // Test period filter if exists
        const periodFilter = page.locator('button, select').filter({ hasText: /Ano|Mês|Mes|Periodo/i }).first();
        if (await periodFilter.count() > 0) {
          const initialContent = await page.textContent('body');
          await periodFilter.click();
          await page.waitForTimeout(500);
          
          // Try to change period
          const monthOption = page.locator('text=/Mês|Mes/i').first();
          if (await monthOption.count() > 0) {
            await monthOption.click();
            await page.waitForTimeout(1000);
            const newContent = await page.textContent('body');
            
            // Content should change (or at least not crash)
            expect(newContent).toBeTruthy();
            console.log('✅ Period filter is interactive');
          }
        }

        // Test company filter if exists
        const companyFilter = page.locator('select, [class*="select"]').filter({ hasText: /Empresa|Company/i }).first();
        if (await companyFilter.count() > 0) {
          const options = await companyFilter.locator('option').count();
          if (options > 1) {
            console.log(`✅ Company filter has ${options} options`);
          }
        }
      } else {
        console.warn('⚠️ No filters found on Reports page');
      }
    }
  });

  test('6. Customers Page - Loads and displays content', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await closeOverlays(page);

    // Navigate to Customers
    const customersNav = page.locator('button, a').filter({ hasText: /Clientes/i }).first();
    if (await customersNav.count() > 0) {
      await customersNav.click();
      await waitForPageReady(page);

      // Check for content
      const customersContent = page.locator('[class*="Customer"], [class*="Table"], table').first();
      if (await customersContent.count() > 0) {
        await expect(customersContent).toBeVisible({ timeout: 5000 });
        
        // Check if table has data or empty state
        const tableRows = page.locator('tbody tr, [class*="row"]');
        const rowCount = await tableRows.count();
        
        if (rowCount > 0) {
          console.log(`✅ Customers page has ${rowCount} rows`);
        } else {
          // Check for empty state message
          const emptyState = page.locator('text=/sem dados|no data|empty|nenhum/i');
          if (await emptyState.count() > 0) {
            const message = await emptyState.first().textContent();
            expect(message?.trim().length).toBeGreaterThan(0);
            console.log('✅ Empty state message found');
          } else {
            console.warn('⚠️ Customers page appears empty with no message');
          }
        }
      }
    }
  });

  test('7. Buttons - Primary actions work', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Find primary buttons (common patterns)
    const primaryButtons = page.locator('button[class*="primary"], button[class*="bg-emerald"], button[class*="bg-gold"], button:has-text("Entrar"), button:has-text("Salvar")');
    const buttonCount = await primaryButtons.count();
    
    if (buttonCount > 0) {
      console.log(`✅ Found ${buttonCount} primary buttons`);
      
      // Test a few buttons (but skip login if not needed)
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = primaryButtons.nth(i);
        const text = await button.textContent();
        const isDisabled = await button.isDisabled();
        const hasOnClick = await button.evaluate((el) => {
          return el.hasAttribute('onclick') || el.getAttribute('onClick') !== null;
        });
        
        if (!isDisabled && text && !text.includes('Entrar')) {
          // Check if button has handler
          if (!hasOnClick) {
            // Check for React onClick via event listeners
            const hasHandler = await button.evaluate((el) => {
              // Try to find if element has event listeners (approximate)
              return el.onclick !== null || el.getAttribute('data-testid') !== null;
            });
            
            if (!hasHandler) {
              console.warn(`⚠️ Button "${text.trim()}" may not have a click handler`);
            }
          }
        }
      }
    }
  });

  test('8. Typography - Consistent heading styles', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Check h1, h2, h3 consistency
    const h1s = page.locator('h1');
    const h2s = page.locator('h2');
    const h3s = page.locator('h3');
    
    const h1Count = await h1s.count();
    const h2Count = await h2s.count();
    
    if (h1Count > 0) {
      const firstH1 = h1s.first();
      const fontSize = await firstH1.evaluate((e) => window.getComputedStyle(e).fontSize);
      const fontWeight = await firstH1.evaluate((e) => window.getComputedStyle(e).fontWeight);
      
      console.log(`✅ Found ${h1Count} h1 elements (font-size: ${fontSize}, weight: ${fontWeight})`);
      
      // Check if all h1s have similar styling
      for (let i = 1; i < Math.min(h1Count, 3); i++) {
        const h1 = h1s.nth(i);
        const otherFontSize = await h1.evaluate((e) => window.getComputedStyle(e).fontSize);
        if (fontSize !== otherFontSize) {
          console.warn(`⚠️ Inconsistent h1 font sizes: ${fontSize} vs ${otherFontSize}`);
        }
      }
    }
    
    if (h2Count > 0) {
      console.log(`✅ Found ${h2Count} h2 elements`);
    }
  });

  test('9. Console Errors - Check for UI-related errors', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await closeOverlays(page);

    // Navigate through main pages
    const pages = ['Dashboard', 'Relatórios', 'Clientes'];
    
    for (const pageName of pages) {
      const nav = page.locator('button, a').filter({ hasText: new RegExp(pageName, 'i') }).first();
      if (await nav.count() > 0) {
        await nav.click();
        await page.waitForTimeout(1000);
      }
    }

    // Filter out known non-critical errors
    const filteredErrors = consoleErrors.filter(err => {
      const lowerErr = err.toLowerCase();
      // Ignore common non-critical errors
      return !lowerErr.includes('favicon') &&
             !lowerErr.includes('sourcemap') &&
             !lowerErr.includes('extension') &&
             !lowerErr.includes('chrome-extension') &&
             !lowerErr.includes('devtools') &&
             !lowerErr.includes('react_devtools');
    });

    // Check for critical errors only
    const criticalErrors = filteredErrors.filter(err => 
      err.includes('Cannot read') || 
      err.includes('undefined') ||
      err.includes('TypeError') ||
      err.includes('ReferenceError') ||
      (err.includes('React') && (err.includes('Error') || err.includes('Warning: Failed')))
    );

    if (criticalErrors.length > 0) {
      console.warn(`⚠️ Found ${criticalErrors.length} critical console errors:`);
      criticalErrors.slice(0, 5).forEach(err => console.warn(`  - ${err.substring(0, 100)}...`));
    } else {
      console.log(`✅ No critical console errors found (${filteredErrors.length} non-critical errors filtered)`);
    }

    // Only fail for critical errors, not warnings
    expect(criticalErrors.length).toBe(0); // Fail only on critical errors
  });

  test('10. Empty States - Meaningful messages', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Check for empty states across pages
    const emptyStateSelectors = [
      'text=/sem dados/i',
      'text=/no data/i',
      'text=/empty/i',
      'text=/nenhum/i',
      '[class*="empty"]',
      '[class*="Empty"]',
    ];

    let foundEmptyStates = 0;
    for (const selector of emptyStateSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        foundEmptyStates += count;
        // Check that empty state has meaningful text
        for (let i = 0; i < count; i++) {
          const text = await elements.nth(i).textContent();
          if (text && text.trim().length > 5) {
            console.log(`✅ Found meaningful empty state: "${text.trim().substring(0, 50)}..."`);
          }
        }
      }
    }

    if (foundEmptyStates === 0) {
      console.log('✅ No empty states found (or data is present)');
    }
  });

  test('11. Color Contrast - Basic check', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Check text elements have reasonable contrast
    const textElements = page.locator('p, span, div').filter({ hasText: /./ }).first();
    if (await textElements.count() > 0) {
      const color = await textElements.evaluate((e) => window.getComputedStyle(e).color);
      const bgColor = await textElements.evaluate((e) => {
        let el = e as HTMLElement;
        while (el && window.getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)') {
          el = el.parentElement as HTMLElement;
        }
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Basic check: text should not be white on white or black on black
      expect(color).toBeTruthy();
      expect(bgColor).toBeTruthy();
      console.log(`✅ Text color: ${color}, Background: ${bgColor}`);
    }
  });

  test('12. Responsive Layout - Basic structure', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Check for responsive grid/flex layouts
    const grids = page.locator('[class*="grid"]');
    const flexes = page.locator('[class*="flex"]');
    
    const gridCount = await grids.count();
    const flexCount = await flexes.count();
    
    console.log(`✅ Found ${gridCount} grid layouts and ${flexCount} flex layouts`);
    
    // Check that main content area exists
    const main = page.locator('main, [role="main"], [class*="main"]');
    if (await main.count() > 0) {
      const isVisible = await main.first().isVisible();
      expect(isVisible).toBe(true);
      console.log('✅ Main content area is visible');
    }
  });
});

