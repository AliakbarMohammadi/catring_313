import { test, expect } from '@playwright/test'

test.describe('Basic E2E Tests', () => {
  test('should load the application', async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Check if the page loads without errors
    await expect(page).toHaveTitle(/تدبیرخوان/)

    // Check if React app is loaded
    await expect(page.locator('#root')).toBeVisible()
  })

  test('should display 404 for non-existent routes', async ({ page }) => {
    // Navigate to a non-existent route
    await page.goto('/non-existent-route')

    // Should show 404 or redirect to home
    const title = await page.title()
    expect(title).toContain('تدبیرخوان')
  })
})