import { test, expect } from '@playwright/test';

test.describe('Timeline Selection Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should toggle commit selection and unselection', async ({ page }) => {
    // Setup repository with Microsoft MSSQL Python repo
    const repositoryUrl = 'https://github.com/microsoft/mssql-python';
    const urlInput = page.getByPlaceholder('https://github.com/owner/repo');
    await urlInput.fill(repositoryUrl);
    const analyzeButton = page.getByRole('button', { name: /analyze/i });
    await analyzeButton.click();
    
    // Wait for commits to load
    await expect(page.locator('.vertical-timeline-element')).toBeVisible({ timeout: 30000 });
    
    // Get the first commit element
    const firstCommit = page.locator('.vertical-timeline-element').first();
    
    // Should have selected indicator initially (auto-selected)
    await expect(page.getByText('✨ Selected - View onboarding insights')).toBeVisible();
    
    // Click the same commit to unselect it
    await firstCommit.click();
    
    // Selected indicator should disappear
    await expect(page.getByText('✨ Selected - View onboarding insights')).not.toBeVisible();
    
    // Click again to select it
    await firstCommit.click();
    
    // Selected indicator should reappear
    await expect(page.getByText('✨ Selected - View onboarding insights')).toBeVisible();
    
    // Try selecting a different commit
    const secondCommit = page.locator('.vertical-timeline-element').nth(1);
    await secondCommit.click();
    
    // Should still have one selected indicator (moved to new commit)
    await expect(page.getByText('✨ Selected - View onboarding insights')).toBeVisible();
    
    // Only one commit should be selected at a time
    const selectedIndicators = page.getByText('✨ Selected - View onboarding insights');
    await expect(selectedIndicators).toHaveCount(1);
  });
});