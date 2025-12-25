import { test, expect } from '@playwright/test'

test.describe('Notification System E2E Tests', () => {
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

    // Mock notifications data
    await page.route('**/api/notifications', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [
            {
              id: 1,
              title: 'سفارش شما تأیید شد',
              message: 'سفارش #123 شما با موفقیت تأیید شد و در حال آماده‌سازی است.',
              type: 'order_confirmed',
              read: false,
              createdAt: '2024-01-15T10:30:00Z'
            },
            {
              id: 2,
              title: 'منوی جدید منتشر شد',
              message: 'منوی فردا منتشر شد. برای مشاهده و سفارش کلیک کنید.',
              type: 'menu_published',
              read: false,
              createdAt: '2024-01-15T09:00:00Z'
            },
            {
              id: 3,
              title: 'سفارش تحویل داده شد',
              message: 'سفارش #120 شما با موفقیت تحویل داده شد.',
              type: 'order_delivered',
              read: true,
              createdAt: '2024-01-14T13:45:00Z'
            },
            {
              id: 4,
              title: 'یادآوری سفارش',
              message: 'فرصت سفارش برای فردا تا ساعت ۱۸ باقی مانده است.',
              type: 'order_reminder',
              read: true,
              createdAt: '2024-01-14T16:00:00Z'
            }
          ],
          unreadCount: 2
        })
      })
    })

    await page.goto('/notifications')
  })

  test('should display notifications page correctly', async ({ page }) => {
    // Check page title
    await expect(page.getByText('اعلان‌ها')).toBeVisible()

    // Check unread count badge
    await expect(page.getByText('۲ اعلان خوانده نشده')).toBeVisible()

    // Check notifications are displayed
    await expect(page.getByText('سفارش شما تأیید شد')).toBeVisible()
    await expect(page.getByText('منوی جدید منتشر شد')).toBeVisible()
    await expect(page.getByText('سفارش تحویل داده شد')).toBeVisible()
    await expect(page.getByText('یادآوری سفارش')).toBeVisible()

    // Check notification messages
    await expect(page.getByText('سفارش #123 شما با موفقیت تأیید شد')).toBeVisible()
    await expect(page.getByText('منوی فردا منتشر شد')).toBeVisible()

    // Check read/unread status
    const unreadNotifications = page.locator('[data-testid^="notification-"]:has([data-testid="unread-indicator"])')
    await expect(unreadNotifications).toHaveCount(2)
  })

  test('should mark notification as read', async ({ page }) => {
    // Mock mark as read API
    await page.route('**/api/notifications/1/read', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true
        })
      })
    })

    // Click on unread notification
    await page.locator('[data-testid="notification-1"]').click()

    // Notification should be marked as read (unread indicator should disappear)
    await expect(page.locator('[data-testid="notification-1"] [data-testid="unread-indicator"]')).not.toBeVisible()

    // Unread count should decrease
    await expect(page.getByText('۱ اعلان خوانده نشده')).toBeVisible()
  })

  test('should mark all notifications as read', async ({ page }) => {
    // Mock mark all as read API
    await page.route('**/api/notifications/mark-all-read', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true
        })
      })
    })

    // Click mark all as read button
    await page.getByRole('button', { name: 'همه را خوانده علامت‌گذاری کن' }).click()

    // All unread indicators should disappear
    await expect(page.locator('[data-testid="unread-indicator"]')).toHaveCount(0)

    // Unread count should be zero
    await expect(page.getByText('همه اعلان‌ها خوانده شده')).toBeVisible()
  })

  test('should filter notifications by type', async ({ page }) => {
    // Initially all notifications should be visible
    await expect(page.getByText('سفارش شما تأیید شد')).toBeVisible()
    await expect(page.getByText('منوی جدید منتشر شد')).toBeVisible()
    await expect(page.getByText('سفارش تحویل داده شد')).toBeVisible()
    await expect(page.getByText('یادآوری سفارش')).toBeVisible()

    // Filter by order notifications
    await page.getByRole('button', { name: 'سفارشات' }).click()
    await expect(page.getByText('سفارش شما تأیید شد')).toBeVisible()
    await expect(page.getByText('سفارش تحویل داده شد')).toBeVisible()
    await expect(page.getByText('منوی جدید منتشر شد')).not.toBeVisible()
    await expect(page.getByText('یادآوری سفارش')).not.toBeVisible()

    // Filter by menu notifications
    await page.getByRole('button', { name: 'منو' }).click()
    await expect(page.getByText('منوی جدید منتشر شد')).toBeVisible()
    await expect(page.getByText('سفارش شما تأیید شد')).not.toBeVisible()
    await expect(page.getByText('سفارش تحویل داده شد')).not.toBeVisible()
    await expect(page.getByText('یادآوری سفارش')).not.toBeVisible()

    // Filter by reminders
    await page.getByRole('button', { name: 'یادآوری‌ها' }).click()
    await expect(page.getByText('یادآوری سفارش')).toBeVisible()
    await expect(page.getByText('سفارش شما تأیید شد')).not.toBeVisible()
    await expect(page.getByText('منوی جدید منتشر شد')).not.toBeVisible()
    await expect(page.getByText('سفارش تحویل داده شد')).not.toBeVisible()

    // Show all notifications
    await page.getByRole('button', { name: 'همه' }).click()
    await expect(page.getByText('سفارش شما تأیید شد')).toBeVisible()
    await expect(page.getByText('منوی جدید منتشر شد')).toBeVisible()
    await expect(page.getByText('سفارش تحویل داده شد')).toBeVisible()
    await expect(page.getByText('یادآوری سفارش')).toBeVisible()
  })

  test('should delete notification', async ({ page }) => {
    // Mock delete notification API
    await page.route('**/api/notifications/3', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true
          })
        })
      }
    })

    // Click delete button on a notification
    await page.locator('[data-testid="notification-3"]').getByRole('button', { name: 'حذف' }).click()

    // Confirmation dialog should appear
    await expect(page.getByText('آیا از حذف این اعلان اطمینان دارید؟')).toBeVisible()

    // Confirm deletion
    await page.getByRole('button', { name: 'بله، حذف کن' }).click()

    // Notification should be removed
    await expect(page.getByText('سفارش تحویل داده شد')).not.toBeVisible()

    // Success message should appear
    await expect(page.getByText('اعلان حذف شد')).toBeVisible()
  })

  test('should navigate to related content from notification', async ({ page }) => {
    // Click on order confirmation notification
    await page.getByText('سفارش #123 شما با موفقیت تأیید شد').click()

    // Should navigate to order details
    await expect(page).toHaveURL('/orders/123')

    // Go back to notifications
    await page.goto('/notifications')

    // Click on menu published notification
    await page.getByText('منوی فردا منتشر شد').click()

    // Should navigate to menu page
    await expect(page).toHaveURL('/menu')
  })

  test('should show notification in header dropdown', async ({ page }) => {
    // Navigate to any page
    await page.goto('/dashboard')

    // Check notification bell icon
    await expect(page.getByRole('button', { name: 'اعلان‌ها' })).toBeVisible()

    // Should show unread count badge
    await expect(page.getByText('۲')).toBeVisible()

    // Click notification bell
    await page.getByRole('button', { name: 'اعلان‌ها' }).click()

    // Dropdown should open with recent notifications
    await expect(page.getByText('اعلان‌های اخیر')).toBeVisible()
    await expect(page.getByText('سفارش شما تأیید شد')).toBeVisible()
    await expect(page.getByText('منوی جدید منتشر شد')).toBeVisible()

    // Should have link to view all notifications
    await expect(page.getByRole('link', { name: 'مشاهده همه اعلان‌ها' })).toBeVisible()
  })
})

test.describe('Notification Settings E2E Tests', () => {
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

    // Mock notification preferences
    await page.route('**/api/notifications/preferences', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preferences: {
            orderConfirmation: {
              email: true,
              sms: true,
              push: true
            },
            orderDelivered: {
              email: true,
              sms: false,
              push: true
            },
            menuPublished: {
              email: false,
              sms: false,
              push: true
            },
            orderReminder: {
              email: true,
              sms: true,
              push: false
            },
            promotions: {
              email: false,
              sms: false,
              push: false
            }
          }
        })
      })
    })

    await page.goto('/notifications/settings')
  })

  test('should display notification settings correctly', async ({ page }) => {
    // Check page title
    await expect(page.getByText('تنظیمات اعلان‌ها')).toBeVisible()

    // Check notification types
    await expect(page.getByText('تأیید سفارش')).toBeVisible()
    await expect(page.getByText('تحویل سفارش')).toBeVisible()
    await expect(page.getByText('انتشار منو')).toBeVisible()
    await expect(page.getByText('یادآوری سفارش')).toBeVisible()
    await expect(page.getByText('تخفیف‌ها و پیشنهادات')).toBeVisible()

    // Check notification methods
    await expect(page.getByText('ایمیل')).toBeVisible()
    await expect(page.getByText('پیامک')).toBeVisible()
    await expect(page.getByText('اعلان موبایل')).toBeVisible()

    // Check current settings
    const orderConfirmationEmail = page.locator('[data-testid="orderConfirmation-email"]')
    await expect(orderConfirmationEmail).toBeChecked()

    const menuPublishedEmail = page.locator('[data-testid="menuPublished-email"]')
    await expect(menuPublishedEmail).not.toBeChecked()
  })

  test('should update notification preferences', async ({ page }) => {
    // Mock update preferences API
    await page.route('**/api/notifications/preferences', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'تنظیمات با موفقیت ذخیره شد'
          })
        })
      }
    })

    // Change some settings
    await page.locator('[data-testid="orderDelivered-sms"]').check()
    await page.locator('[data-testid="menuPublished-email"]').check()
    await page.locator('[data-testid="promotions-push"]').check()

    // Save settings
    await page.getByRole('button', { name: 'ذخیره تنظیمات' }).click()

    // Should show success message
    await expect(page.getByText('تنظیمات با موفقیت ذخیره شد')).toBeVisible()
  })

  test('should toggle all notifications for a method', async ({ page }) => {
    // Click "همه" toggle for email
    await page.locator('[data-testid="toggle-all-email"]').click()

    // All email checkboxes should be unchecked
    await expect(page.locator('[data-testid="orderConfirmation-email"]')).not.toBeChecked()
    await expect(page.locator('[data-testid="orderDelivered-email"]')).not.toBeChecked()
    await expect(page.locator('[data-testid="menuPublished-email"]')).not.toBeChecked()
    await expect(page.locator('[data-testid="orderReminder-email"]')).not.toBeChecked()
    await expect(page.locator('[data-testid="promotions-email"]')).not.toBeChecked()

    // Click again to enable all
    await page.locator('[data-testid="toggle-all-email"]').click()

    // All email checkboxes should be checked
    await expect(page.locator('[data-testid="orderConfirmation-email"]')).toBeChecked()
    await expect(page.locator('[data-testid="orderDelivered-email"]')).toBeChecked()
    await expect(page.locator('[data-testid="menuPublished-email"]')).toBeChecked()
    await expect(page.locator('[data-testid="orderReminder-email"]')).toBeChecked()
    await expect(page.locator('[data-testid="promotions-email"]')).toBeChecked()
  })

  test('should disable all notifications', async ({ page }) => {
    // Mock update preferences API
    await page.route('**/api/notifications/preferences', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'همه اعلان‌ها غیرفعال شدند'
          })
        })
      }
    })

    // Click disable all notifications button
    await page.getByRole('button', { name: 'غیرفعال کردن همه اعلان‌ها' }).click()

    // Confirmation dialog should appear
    await expect(page.getByText('آیا از غیرفعال کردن همه اعلان‌ها اطمینان دارید؟')).toBeVisible()

    // Confirm
    await page.getByRole('button', { name: 'بله، غیرفعال کن' }).click()

    // All checkboxes should be unchecked
    const allCheckboxes = page.locator('input[type="checkbox"]')
    const count = await allCheckboxes.count()
    for (let i = 0; i < count; i++) {
      await expect(allCheckboxes.nth(i)).not.toBeChecked()
    }

    // Should show success message
    await expect(page.getByText('همه اعلان‌ها غیرفعال شدند')).toBeVisible()
  })

  test('should test notification delivery', async ({ page }) => {
    // Mock test notification API
    await page.route('**/api/notifications/test', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'اعلان آزمایشی ارسال شد'
        })
      })
    })

    // Click test notification button
    await page.getByRole('button', { name: 'ارسال اعلان آزمایشی' }).click()

    // Test notification modal should open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('ارسال اعلان آزمایشی')).toBeVisible()

    // Select notification method
    await page.getByRole('radio', { name: 'ایمیل' }).check()

    // Send test notification
    await page.getByRole('button', { name: 'ارسال' }).click()

    // Should show success message
    await expect(page.getByText('اعلان آزمایشی ارسال شد')).toBeVisible()
  })

  test('should show notification delivery status', async ({ page }) => {
    // Mock delivery status API
    await page.route('**/api/notifications/delivery-status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: {
            status: 'active',
            lastDelivery: '2024-01-15T10:30:00Z',
            failureCount: 0
          },
          sms: {
            status: 'active',
            lastDelivery: '2024-01-15T09:15:00Z',
            failureCount: 0
          },
          push: {
            status: 'inactive',
            lastDelivery: null,
            failureCount: 3,
            error: 'دستگاه ثبت نشده'
          }
        })
      })
    })

    // Navigate to delivery status section
    await page.getByRole('tab', { name: 'وضعیت تحویل' }).click()

    // Check delivery status
    await expect(page.getByText('ایمیل: فعال')).toBeVisible()
    await expect(page.getByText('پیامک: فعال')).toBeVisible()
    await expect(page.getByText('اعلان موبایل: غیرفعال')).toBeVisible()

    // Check last delivery times
    await expect(page.getByText('آخرین ارسال: امروز ۱۰:۳۰')).toBeVisible()

    // Check error messages
    await expect(page.getByText('دستگاه ثبت نشده')).toBeVisible()
  })
})