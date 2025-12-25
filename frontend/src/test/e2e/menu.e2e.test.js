import { test, expect } from '@playwright/test'

test.describe('Menu Browsing E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'احمد محمدی',
          email: 'ahmad@example.com',
          role: 'individual',
          isAuthenticated: true
        })
      })
    })

    // Mock menu data
    await page.route('**/api/menu/daily/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: '2024-01-15',
          items: [
            {
              id: 1,
              name: 'قورمه سبزی',
              description: 'قورمه سبزی با گوشت و برنج',
              price: 45000,
              category: 'غذای اصلی',
              available: true,
              image: '/images/ghormeh-sabzi.jpg'
            },
            {
              id: 2,
              name: 'کباب کوبیده',
              description: 'کباب کوبیده با برنج و سالاد',
              price: 55000,
              category: 'غذای اصلی',
              available: true,
              image: '/images/kabab-koobideh.jpg'
            },
            {
              id: 3,
              name: 'آش رشته',
              description: 'آش رشته سنتی با کشک',
              price: 35000,
              category: 'سوپ',
              available: false,
              image: '/images/ash-reshteh.jpg'
            }
          ]
        })
      })
    })

    // Navigate to menu page
    await page.goto('/menu')
  })

  test('should display daily menu correctly', async ({ page }) => {
    // Check page title and header
    await expect(page.getByText('منوی روزانه')).toBeVisible()
    await expect(page.getByText('دوشنبه، ۲۵ دی ۱۴۰۳')).toBeVisible()

    // Check menu items are displayed
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).toBeVisible()
    await expect(page.getByText('آش رشته')).toBeVisible()

    // Check prices are displayed
    await expect(page.getByText('۴۵,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('۵۵,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('۳۵,۰۰۰ تومان')).toBeVisible()
  })

  test('should filter menu items by category', async ({ page }) => {
    // Check all items are visible initially
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).toBeVisible()
    await expect(page.getByText('آش رشته')).toBeVisible()

    // Click on "سوپ" category filter
    await page.getByRole('button', { name: 'سوپ' }).click()

    // Only soup items should be visible
    await expect(page.getByText('آش رشته')).toBeVisible()
    await expect(page.getByText('قورمه سبزی')).not.toBeVisible()
    await expect(page.getByText('کباب کوبیده')).not.toBeVisible()

    // Click on "غذای اصلی" category filter
    await page.getByRole('button', { name: 'غذای اصلی' }).click()

    // Only main dishes should be visible
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).toBeVisible()
    await expect(page.getByText('آش رشته')).not.toBeVisible()

    // Click on "همه" to show all items
    await page.getByRole('button', { name: 'همه' }).click()

    // All items should be visible again
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).toBeVisible()
    await expect(page.getByText('آش رشته')).toBeVisible()
  })

  test('should show unavailable items as disabled', async ({ page }) => {
    // Find the unavailable item (آش رشته)
    const unavailableItem = page.locator('[data-testid="menu-item-3"]')
    
    // Should have disabled styling
    await expect(unavailableItem).toHaveClass(/opacity-50/)
    
    // Add to cart button should be disabled
    const addButton = unavailableItem.getByRole('button', { name: 'افزودن به سبد' })
    await expect(addButton).toBeDisabled()
    
    // Should show "ناموجود" text
    await expect(unavailableItem.getByText('ناموجود')).toBeVisible()
  })

  test('should add items to cart', async ({ page }) => {
    // Add first item to cart
    const firstItem = page.locator('[data-testid="menu-item-1"]')
    await firstItem.getByRole('button', { name: 'افزودن به سبد' }).click()

    // Cart count should update
    await expect(page.getByText('۱')).toBeVisible() // Cart badge

    // Add second item to cart
    const secondItem = page.locator('[data-testid="menu-item-2"]')
    await secondItem.getByRole('button', { name: 'افزودن به سبد' }).click()

    // Cart count should update to 2
    await expect(page.getByText('۲')).toBeVisible()
  })

  test('should navigate to different dates', async ({ page }) => {
    // Mock API for different date
    await page.route('**/api/menu/daily/2024-01-16', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: '2024-01-16',
          items: [
            {
              id: 4,
              name: 'فسنجان',
              description: 'فسنجان با مرغ و برنج',
              price: 50000,
              category: 'غذای اصلی',
              available: true,
              image: '/images/fesenjan.jpg'
            }
          ]
        })
      })
    })

    // Click next day button
    await page.getByRole('button', { name: 'روز بعد' }).click()

    // Should show next day's menu
    await expect(page.getByText('سه‌شنبه، ۲۶ دی ۱۴۰۳')).toBeVisible()
    await expect(page.getByText('فسنجان')).toBeVisible()
    await expect(page.getByText('قورمه سبزی')).not.toBeVisible()
  })

  test('should open item details modal', async ({ page }) => {
    // Click on menu item to open details
    await page.getByText('قورمه سبزی').click()

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('جزئیات غذا')).toBeVisible()
    await expect(page.getByText('قورمه سبزی با گوشت و برنج')).toBeVisible()

    // Should show nutritional info or ingredients
    await expect(page.getByText('مواد تشکیل‌دهنده')).toBeVisible()

    // Close modal
    await page.getByRole('button', { name: 'بستن' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should search menu items', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder('جستجو در منو...').fill('قورمه')

    // Should show only matching items
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).not.toBeVisible()
    await expect(page.getByText('آش رشته')).not.toBeVisible()

    // Clear search
    await page.getByPlaceholder('جستجو در منو...').clear()

    // All items should be visible again
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).toBeVisible()
    await expect(page.getByText('آش رشته')).toBeVisible()
  })
})

test.describe('Cart Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and menu data (same as above)
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'احمد محمدی',
          email: 'ahmad@example.com',
          role: 'individual',
          isAuthenticated: true
        })
      })
    })

    await page.route('**/api/menu/daily/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: '2024-01-15',
          items: [
            {
              id: 1,
              name: 'قورمه سبزی',
              description: 'قورمه سبزی با گوشت و برنج',
              price: 45000,
              category: 'غذای اصلی',
              available: true,
              image: '/images/ghormeh-sabzi.jpg'
            },
            {
              id: 2,
              name: 'کباب کوبیده',
              description: 'کباب کوبیده با برنج و سالاد',
              price: 55000,
              category: 'غذای اصلی',
              available: true,
              image: '/images/kabab-koobideh.jpg'
            }
          ]
        })
      })
    })

    await page.goto('/menu')
  })

  test('should manage cart items correctly', async ({ page }) => {
    // Add items to cart
    await page.locator('[data-testid="menu-item-1"]').getByRole('button', { name: 'افزودن به سبد' }).click()
    await page.locator('[data-testid="menu-item-2"]').getByRole('button', { name: 'افزودن به سبد' }).click()

    // Open cart
    await page.getByRole('button', { name: 'سبد خرید' }).click()

    // Cart should show items
    await expect(page.getByText('سبد خرید شما')).toBeVisible()
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).toBeVisible()

    // Should show total price
    await expect(page.getByText('۱۰۰,۰۰۰ تومان')).toBeVisible()

    // Increase quantity
    await page.locator('[data-testid="cart-item-1"]').getByRole('button', { name: '+' }).click()
    await expect(page.getByText('۱۴۵,۰۰۰ تومان')).toBeVisible() // Updated total

    // Decrease quantity
    await page.locator('[data-testid="cart-item-1"]').getByRole('button', { name: '-' }).click()
    await expect(page.getByText('۱۰۰,۰۰۰ تومان')).toBeVisible() // Back to original total

    // Remove item from cart
    await page.locator('[data-testid="cart-item-2"]').getByRole('button', { name: 'حذف' }).click()
    await expect(page.getByText('کباب کوبیده')).not.toBeVisible()
    await expect(page.getByText('۴۵,۰۰۰ تومان')).toBeVisible() // Updated total
  })

  test('should proceed to checkout', async ({ page }) => {
    // Add item to cart
    await page.locator('[data-testid="menu-item-1"]').getByRole('button', { name: 'افزودن به سبد' }).click()

    // Open cart
    await page.getByRole('button', { name: 'سبد خرید' }).click()

    // Click checkout button
    await page.getByRole('button', { name: 'ادامه خرید' }).click()

    // Should navigate to checkout page
    await expect(page).toHaveURL('/checkout')
  })
})