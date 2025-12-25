import { test, expect } from '@playwright/test'

test.describe('Order Management E2E Tests', () => {
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

    // Mock orders data
    await page.route('**/api/orders', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            orders: [
              {
                id: 1,
                date: '2024-01-15',
                status: 'confirmed',
                total: 45000,
                items: [
                  {
                    id: 1,
                    name: 'قورمه سبزی',
                    quantity: 1,
                    price: 45000
                  }
                ],
                createdAt: '2024-01-15T10:30:00Z'
              },
              {
                id: 2,
                date: '2024-01-14',
                status: 'delivered',
                total: 100000,
                items: [
                  {
                    id: 1,
                    name: 'قورمه سبزی',
                    quantity: 1,
                    price: 45000
                  },
                  {
                    id: 2,
                    name: 'کباب کوبیده',
                    quantity: 1,
                    price: 55000
                  }
                ],
                createdAt: '2024-01-14T09:15:00Z'
              },
              {
                id: 3,
                date: '2024-01-13',
                status: 'cancelled',
                total: 35000,
                items: [
                  {
                    id: 3,
                    name: 'آش رشته',
                    quantity: 1,
                    price: 35000
                  }
                ],
                createdAt: '2024-01-13T11:45:00Z'
              }
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 3,
              totalPages: 1
            }
          })
        })
      }
    })

    await page.goto('/orders')
  })

  test('should display orders list correctly', async ({ page }) => {
    // Check page title
    await expect(page.getByText('سفارشات من')).toBeVisible()

    // Check orders are displayed
    await expect(page.getByText('سفارش #1')).toBeVisible()
    await expect(page.getByText('سفارش #2')).toBeVisible()
    await expect(page.getByText('سفارش #3')).toBeVisible()

    // Check order statuses
    await expect(page.getByText('تأیید شده')).toBeVisible()
    await expect(page.getByText('تحویل داده شده')).toBeVisible()
    await expect(page.getByText('لغو شده')).toBeVisible()

    // Check order totals
    await expect(page.getByText('۴۵,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('۱۰۰,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('۳۵,۰۰۰ تومان')).toBeVisible()
  })

  test('should filter orders by status', async ({ page }) => {
    // Initially all orders should be visible
    await expect(page.getByText('سفارش #1')).toBeVisible()
    await expect(page.getByText('سفارش #2')).toBeVisible()
    await expect(page.getByText('سفارش #3')).toBeVisible()

    // Filter by confirmed status
    await page.getByRole('button', { name: 'تأیید شده' }).click()
    await expect(page.getByText('سفارش #1')).toBeVisible()
    await expect(page.getByText('سفارش #2')).not.toBeVisible()
    await expect(page.getByText('سفارش #3')).not.toBeVisible()

    // Filter by delivered status
    await page.getByRole('button', { name: 'تحویل داده شده' }).click()
    await expect(page.getByText('سفارش #1')).not.toBeVisible()
    await expect(page.getByText('سفارش #2')).toBeVisible()
    await expect(page.getByText('سفارش #3')).not.toBeVisible()

    // Filter by cancelled status
    await page.getByRole('button', { name: 'لغو شده' }).click()
    await expect(page.getByText('سفارش #1')).not.toBeVisible()
    await expect(page.getByText('سفارش #2')).not.toBeVisible()
    await expect(page.getByText('سفارش #3')).toBeVisible()

    // Show all orders
    await page.getByRole('button', { name: 'همه' }).click()
    await expect(page.getByText('سفارش #1')).toBeVisible()
    await expect(page.getByText('سفارش #2')).toBeVisible()
    await expect(page.getByText('سفارش #3')).toBeVisible()
  })

  test('should view order details', async ({ page }) => {
    // Click on first order to view details
    await page.getByText('سفارش #1').click()

    // Order details modal should open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('جزئیات سفارش #1')).toBeVisible()

    // Check order information
    await expect(page.getByText('تاریخ سفارش: دوشنبه، ۲۵ دی ۱۴۰۳')).toBeVisible()
    await expect(page.getByText('وضعیت: تأیید شده')).toBeVisible()
    await expect(page.getByText('مجموع: ۴۵,۰۰۰ تومان')).toBeVisible()

    // Check order items
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('تعداد: ۱')).toBeVisible()

    // Close modal
    await page.getByRole('button', { name: 'بستن' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should cancel order if allowed', async ({ page }) => {
    // Mock cancel order API
    await page.route('**/api/orders/1/cancel', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'سفارش با موفقیت لغو شد',
          order: {
            id: 1,
            status: 'cancelled'
          }
        })
      })
    })

    // Click on first order to view details
    await page.getByText('سفارش #1').click()

    // Cancel button should be visible for confirmed orders
    const cancelButton = page.getByRole('button', { name: 'لغو سفارش' })
    await expect(cancelButton).toBeVisible()

    // Click cancel button
    await cancelButton.click()

    // Confirmation dialog should appear
    await expect(page.getByText('آیا از لغو این سفارش اطمینان دارید؟')).toBeVisible()

    // Confirm cancellation
    await page.getByRole('button', { name: 'بله، لغو کن' }).click()

    // Success message should appear
    await expect(page.getByText('سفارش با موفقیت لغو شد')).toBeVisible()
  })

  test('should search orders by date range', async ({ page }) => {
    // Open date filter
    await page.getByRole('button', { name: 'فیلتر تاریخ' }).click()

    // Set date range
    await page.getByLabel('از تاریخ').fill('1403/10/23') // 2024-01-13
    await page.getByLabel('تا تاریخ').fill('1403/10/24') // 2024-01-14

    // Apply filter
    await page.getByRole('button', { name: 'اعمال فیلتر' }).click()

    // Should show only orders in date range
    await expect(page.getByText('سفارش #2')).toBeVisible()
    await expect(page.getByText('سفارش #3')).toBeVisible()
    await expect(page.getByText('سفارش #1')).not.toBeVisible()
  })

  test('should reorder previous order', async ({ page }) => {
    // Mock menu availability check
    await page.route('**/api/menu/check-availability', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          items: [
            {
              id: 1,
              name: 'قورمه سبزی',
              price: 45000,
              available: true
            }
          ]
        })
      })
    })

    // Click on delivered order
    await page.getByText('سفارش #2').click()

    // Reorder button should be visible for delivered orders
    const reorderButton = page.getByRole('button', { name: 'سفارش مجدد' })
    await expect(reorderButton).toBeVisible()

    // Click reorder button
    await reorderButton.click()

    // Should navigate to menu page with items added to cart
    await expect(page).toHaveURL('/menu')
    await expect(page.getByText('۲')).toBeVisible() // Cart count
  })

  test('should export orders to PDF', async ({ page }) => {
    // Mock PDF export
    await page.route('**/api/orders/export/pdf', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="orders.pdf"'
        },
        body: Buffer.from('PDF content')
      })
    })

    // Click export button
    await page.getByRole('button', { name: 'خروجی PDF' }).click()

    // Download should start (in real test, you'd check for download)
    // This is a simplified check
    await expect(page.getByText('در حال دانلود...')).toBeVisible()
  })
})

test.describe('Checkout Process E2E Tests', () => {
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

    // Mock cart data
    await page.addInitScript(() => {
      window.localStorage.setItem('cart', JSON.stringify([
        {
          id: 1,
          name: 'قورمه سبزی',
          price: 45000,
          quantity: 1,
          date: '2024-01-15'
        },
        {
          id: 2,
          name: 'کباب کوبیده',
          price: 55000,
          quantity: 2,
          date: '2024-01-15'
        }
      ]))
    })

    await page.goto('/checkout')
  })

  test('should display checkout page correctly', async ({ page }) => {
    // Check page title
    await expect(page.getByText('تکمیل سفارش')).toBeVisible()

    // Check order summary
    await expect(page.getByText('خلاصه سفارش')).toBeVisible()
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).toBeVisible()

    // Check quantities and prices
    await expect(page.getByText('۱ عدد')).toBeVisible()
    await expect(page.getByText('۲ عدد')).toBeVisible()
    await expect(page.getByText('۴۵,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('۱۱۰,۰۰۰ تومان')).toBeVisible()

    // Check total
    await expect(page.getByText('مجموع: ۱۵۵,۰۰۰ تومان')).toBeVisible()

    // Check delivery information form
    await expect(page.getByText('اطلاعات تحویل')).toBeVisible()
    await expect(page.getByPlaceholder('آدرس تحویل را وارد کنید')).toBeVisible()
    await expect(page.getByPlaceholder('شماره تماس')).toBeVisible()
  })

  test('should validate delivery information', async ({ page }) => {
    // Try to submit without filling required fields
    await page.getByRole('button', { name: 'ثبت سفارش' }).click()

    // Should show validation errors
    await expect(page.getByText('آدرس تحویل الزامی است')).toBeVisible()
    await expect(page.getByText('شماره تماس الزامی است')).toBeVisible()
  })

  test('should complete order successfully', async ({ page }) => {
    // Mock order creation
    await page.route('**/api/orders', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 123,
            status: 'pending',
            total: 155000,
            message: 'سفارش شما با موفقیت ثبت شد'
          })
        })
      }
    })

    // Fill delivery information
    await page.getByPlaceholder('آدرس تحویل را وارد کنید').fill('تهران، خیابان ولیعصر، پلاک ۱۲۳')
    await page.getByPlaceholder('شماره تماس').fill('09123456789')
    await page.getByPlaceholder('توضیحات اضافی (اختیاری)').fill('طبقه دوم، واحد ۵')

    // Select delivery time
    await page.getByRole('combobox', { name: 'زمان تحویل' }).selectOption('12:00-13:00')

    // Submit order
    await page.getByRole('button', { name: 'ثبت سفارش' }).click()

    // Should navigate to success page
    await expect(page).toHaveURL('/orders/success/123')
    await expect(page.getByText('سفارش شما با موفقیت ثبت شد')).toBeVisible()
    await expect(page.getByText('شماره سفارش: ۱۲۳')).toBeVisible()
  })

  test('should handle payment selection', async ({ page }) => {
    // Fill required fields
    await page.getByPlaceholder('آدرس تحویل را وارد کنید').fill('تهران، خیابان ولیعصر، پلاک ۱۲۳')
    await page.getByPlaceholder('شماره تماس').fill('09123456789')

    // Check payment methods
    await expect(page.getByText('روش پرداخت')).toBeVisible()
    await expect(page.getByText('پرداخت آنلاین')).toBeVisible()
    await expect(page.getByText('پرداخت در محل')).toBeVisible()

    // Select online payment
    await page.getByRole('radio', { name: 'پرداخت آنلاین' }).check()
    await expect(page.getByRole('radio', { name: 'پرداخت آنلاین' })).toBeChecked()

    // Select cash on delivery
    await page.getByRole('radio', { name: 'پرداخت در محل' }).check()
    await expect(page.getByRole('radio', { name: 'پرداخت در محل' })).toBeChecked()
  })

  test('should apply discount code', async ({ page }) => {
    // Mock discount validation
    await page.route('**/api/discounts/validate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          discount: 15000,
          code: 'WELCOME10'
        })
      })
    })

    // Enter discount code
    await page.getByPlaceholder('کد تخفیف').fill('WELCOME10')
    await page.getByRole('button', { name: 'اعمال' }).click()

    // Should show discount applied
    await expect(page.getByText('تخفیف: ۱۵,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('مجموع نهایی: ۱۴۰,۰۰۰ تومان')).toBeVisible()
  })

  test('should handle invalid discount code', async ({ page }) => {
    // Mock invalid discount
    await page.route('**/api/discounts/validate', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: false,
          message: 'کد تخفیف نامعتبر است'
        })
      })
    })

    // Enter invalid discount code
    await page.getByPlaceholder('کد تخفیف').fill('INVALID')
    await page.getByRole('button', { name: 'اعمال' }).click()

    // Should show error message
    await expect(page.getByText('کد تخفیف نامعتبر است')).toBeVisible()
  })
})