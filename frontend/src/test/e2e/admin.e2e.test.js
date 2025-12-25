import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'مدیر سیستم',
          email: 'admin@tadbirkhowan.com',
          role: 'catering_manager',
          isAuthenticated: true
        })
      })
    })

    // Mock dashboard statistics
    await page.route('**/api/admin/dashboard/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          todayOrders: 45,
          todayRevenue: 2250000,
          totalUsers: 1250,
          totalCompanies: 35,
          pendingCompanies: 5,
          lowStockItems: 3,
          recentOrders: [
            {
              id: 1,
              customerName: 'احمد محمدی',
              total: 45000,
              status: 'confirmed',
              createdAt: '2024-01-15T10:30:00Z'
            },
            {
              id: 2,
              customerName: 'شرکت تکنولوژی پارس',
              total: 500000,
              status: 'pending',
              createdAt: '2024-01-15T09:15:00Z'
            }
          ]
        })
      })
    })

    await page.goto('/admin')
  })

  test('should display admin dashboard correctly', async ({ page }) => {
    // Check page title
    await expect(page.getByText('داشبورد مدیریت')).toBeVisible()

    // Check statistics cards
    await expect(page.getByText('سفارشات امروز')).toBeVisible()
    await expect(page.getByText('۴۵')).toBeVisible()

    await expect(page.getByText('درآمد امروز')).toBeVisible()
    await expect(page.getByText('۲,۲۵۰,۰۰۰ تومان')).toBeVisible()

    await expect(page.getByText('کل کاربران')).toBeVisible()
    await expect(page.getByText('۱,۲۵۰')).toBeVisible()

    await expect(page.getByText('کل شرکت‌ها')).toBeVisible()
    await expect(page.getByText('۳۵')).toBeVisible()

    // Check alerts
    await expect(page.getByText('۵ شرکت در انتظار تأیید')).toBeVisible()
    await expect(page.getByText('۳ کالا کم موجود')).toBeVisible()

    // Check recent orders
    await expect(page.getByText('سفارشات اخیر')).toBeVisible()
    await expect(page.getByText('احمد محمدی')).toBeVisible()
    await expect(page.getByText('شرکت تکنولوژی پارس')).toBeVisible()
  })

  test('should navigate to different admin sections', async ({ page }) => {
    // Navigate to menu management
    await page.getByRole('link', { name: 'مدیریت منو' }).click()
    await expect(page).toHaveURL('/admin/menu')

    // Navigate to orders management
    await page.getByRole('link', { name: 'مدیریت سفارشات' }).click()
    await expect(page).toHaveURL('/admin/orders')

    // Navigate to company management
    await page.getByRole('link', { name: 'مدیریت شرکت‌ها' }).click()
    await expect(page).toHaveURL('/admin/companies')

    // Navigate to reports
    await page.getByRole('link', { name: 'گزارشات' }).click()
    await expect(page).toHaveURL('/admin/reports')
  })

  test('should handle quick actions from dashboard', async ({ page }) => {
    // Mock quick action APIs
    await page.route('**/api/admin/companies/pending', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companies: [
            {
              id: 1,
              name: 'شرکت نوآوری دیجیتال',
              email: 'info@digital-innovation.com',
              phone: '02112345678',
              address: 'تهران، خیابان آزادی',
              submittedAt: '2024-01-14T08:00:00Z'
            }
          ]
        })
      })
    })

    // Click on pending companies alert
    await page.getByText('۵ شرکت در انتظار تأیید').click()

    // Should show pending companies modal
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('شرکت‌های در انتظار تأیید')).toBeVisible()
    await expect(page.getByText('شرکت نوآوری دیجیتال')).toBeVisible()

    // Approve company
    await page.getByRole('button', { name: 'تأیید' }).first().click()
    await expect(page.getByText('شرکت با موفقیت تأیید شد')).toBeVisible()
  })
})

test.describe('Menu Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'مدیر سیستم',
          email: 'admin@tadbirkhowan.com',
          role: 'catering_manager',
          isAuthenticated: true
        })
      })
    })

    // Mock food items
    await page.route('**/api/admin/food-items', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              name: 'قورمه سبزی',
              category: 'غذای اصلی',
              price: 45000,
              description: 'قورمه سبزی با گوشت و برنج',
              image: '/images/ghormeh-sabzi.jpg',
              active: true
            },
            {
              id: 2,
              name: 'کباب کوبیده',
              category: 'غذای اصلی',
              price: 55000,
              description: 'کباب کوبیده با برنج و سالاد',
              image: '/images/kabab-koobideh.jpg',
              active: true
            }
          ]
        })
      })
    })

    // Mock daily menus
    await page.route('**/api/admin/daily-menus', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          menus: [
            {
              date: '2024-01-15',
              items: [
                { id: 1, name: 'قورمه سبزی', quantity: 50, available: 45 },
                { id: 2, name: 'کباب کوبیده', quantity: 30, available: 25 }
              ]
            },
            {
              date: '2024-01-16',
              items: [
                { id: 1, name: 'قورمه سبزی', quantity: 40, available: 40 }
              ]
            }
          ]
        })
      })
    })

    await page.goto('/admin/menu')
  })

  test('should display menu management page correctly', async ({ page }) => {
    // Check page title
    await expect(page.getByText('مدیریت منو')).toBeVisible()

    // Check tabs
    await expect(page.getByRole('tab', { name: 'اقلام غذایی' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'منوی روزانه' })).toBeVisible()

    // Check food items are displayed
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).toBeVisible()
    await expect(page.getByText('۴۵,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('۵۵,۰۰۰ تومان')).toBeVisible()
  })

  test('should add new food item', async ({ page }) => {
    // Mock add food item API
    await page.route('**/api/admin/food-items', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 3,
            name: 'فسنجان',
            category: 'غذای اصلی',
            price: 50000,
            description: 'فسنجان با مرغ و برنج',
            active: true
          })
        })
      }
    })

    // Click add new item button
    await page.getByRole('button', { name: 'افزودن غذای جدید' }).click()

    // Fill form
    await page.getByPlaceholder('نام غذا').fill('فسنجان')
    await page.getByRole('combobox', { name: 'دسته‌بندی' }).selectOption('غذای اصلی')
    await page.getByPlaceholder('قیمت (تومان)').fill('50000')
    await page.getByPlaceholder('توضیحات غذا').fill('فسنجان با مرغ و برنج')

    // Submit form
    await page.getByRole('button', { name: 'ذخیره' }).click()

    // Should show success message
    await expect(page.getByText('غذای جدید با موفقیت اضافه شد')).toBeVisible()
  })

  test('should edit existing food item', async ({ page }) => {
    // Mock update food item API
    await page.route('**/api/admin/food-items/1', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            name: 'قورمه سبزی ویژه',
            price: 48000,
            message: 'غذا با موفقیت به‌روزرسانی شد'
          })
        })
      }
    })

    // Click edit button for first item
    await page.locator('[data-testid="food-item-1"]').getByRole('button', { name: 'ویرایش' }).click()

    // Update name and price
    await page.getByPlaceholder('نام غذا').clear()
    await page.getByPlaceholder('نام غذا').fill('قورمه سبزی ویژه')
    await page.getByPlaceholder('قیمت (تومان)').clear()
    await page.getByPlaceholder('قیمت (تومان)').fill('48000')

    // Submit form
    await page.getByRole('button', { name: 'ذخیره' }).click()

    // Should show success message
    await expect(page.getByText('غذا با موفقیت به‌روزرسانی شد')).toBeVisible()
  })

  test('should manage daily menu', async ({ page }) => {
    // Switch to daily menu tab
    await page.getByRole('tab', { name: 'منوی روزانه' }).click()

    // Check daily menus are displayed
    await expect(page.getByText('دوشنبه، ۲۵ دی ۱۴۰۳')).toBeVisible()
    await expect(page.getByText('سه‌شنبه، ۲۶ دی ۱۴۰۳')).toBeVisible()

    // Check menu items and quantities
    await expect(page.getByText('موجود: ۴۵ از ۵۰')).toBeVisible()
    await expect(page.getByText('موجود: ۲۵ از ۳۰')).toBeVisible()
  })

  test('should create new daily menu', async ({ page }) => {
    // Mock create daily menu API
    await page.route('**/api/admin/daily-menus', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            date: '2024-01-17',
            items: [
              { id: 1, quantity: 60 },
              { id: 2, quantity: 40 }
            ],
            message: 'منوی روزانه با موفقیت ایجاد شد'
          })
        })
      }
    })

    // Switch to daily menu tab
    await page.getByRole('tab', { name: 'منوی روزانه' }).click()

    // Click create new menu button
    await page.getByRole('button', { name: 'ایجاد منوی جدید' }).click()

    // Select date
    await page.getByLabel('تاریخ').fill('1403/10/28') // 2024-01-17

    // Add items to menu
    await page.getByRole('checkbox', { name: 'قورمه سبزی' }).check()
    await page.getByPlaceholder('تعداد').first().fill('60')

    await page.getByRole('checkbox', { name: 'کباب کوبیده' }).check()
    await page.getByPlaceholder('تعداد').nth(1).fill('40')

    // Submit form
    await page.getByRole('button', { name: 'ایجاد منو' }).click()

    // Should show success message
    await expect(page.getByText('منوی روزانه با موفقیت ایجاد شد')).toBeVisible()
  })

  test('should update menu item quantities', async ({ page }) => {
    // Mock update quantity API
    await page.route('**/api/admin/daily-menus/2024-01-15/items/1', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'تعداد با موفقیت به‌روزرسانی شد'
          })
        })
      }
    })

    // Switch to daily menu tab
    await page.getByRole('tab', { name: 'منوی روزانه' }).click()

    // Click edit quantity button
    await page.locator('[data-testid="menu-item-1-2024-01-15"]').getByRole('button', { name: 'ویرایش' }).click()

    // Update quantity
    await page.getByPlaceholder('تعداد جدید').fill('55')

    // Submit
    await page.getByRole('button', { name: 'به‌روزرسانی' }).click()

    // Should show success message
    await expect(page.getByText('تعداد با موفقیت به‌روزرسانی شد')).toBeVisible()
  })
})

test.describe('Company Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'مدیر سیستم',
          email: 'admin@tadbirkhowan.com',
          role: 'catering_manager',
          isAuthenticated: true
        })
      })
    })

    // Mock companies data
    await page.route('**/api/admin/companies', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companies: [
            {
              id: 1,
              name: 'شرکت تکنولوژی پارس',
              email: 'info@parstech.com',
              phone: '02112345678',
              address: 'تهران، خیابان ولیعصر',
              status: 'approved',
              employeeCount: 45,
              totalOrders: 120,
              totalSpent: 5400000,
              createdAt: '2024-01-01T00:00:00Z'
            },
            {
              id: 2,
              name: 'شرکت نوآوری دیجیتال',
              email: 'contact@digital-innovation.com',
              phone: '02187654321',
              address: 'تهران، خیابان آزادی',
              status: 'pending',
              employeeCount: 0,
              totalOrders: 0,
              totalSpent: 0,
              createdAt: '2024-01-14T00:00:00Z'
            }
          ]
        })
      })
    })

    await page.goto('/admin/companies')
  })

  test('should display companies list correctly', async ({ page }) => {
    // Check page title
    await expect(page.getByText('مدیریت شرکت‌ها')).toBeVisible()

    // Check companies are displayed
    await expect(page.getByText('شرکت تکنولوژی پارس')).toBeVisible()
    await expect(page.getByText('شرکت نوآوری دیجیتال')).toBeVisible()

    // Check company details
    await expect(page.getByText('info@parstech.com')).toBeVisible()
    await expect(page.getByText('۴۵ کارمند')).toBeVisible()
    await expect(page.getByText('۱۲۰ سفارش')).toBeVisible()
    await expect(page.getByText('۵,۴۰۰,۰۰۰ تومان')).toBeVisible()

    // Check status badges
    await expect(page.getByText('تأیید شده')).toBeVisible()
    await expect(page.getByText('در انتظار تأیید')).toBeVisible()
  })

  test('should filter companies by status', async ({ page }) => {
    // Initially all companies should be visible
    await expect(page.getByText('شرکت تکنولوژی پارس')).toBeVisible()
    await expect(page.getByText('شرکت نوآوری دیجیتال')).toBeVisible()

    // Filter by approved status
    await page.getByRole('button', { name: 'تأیید شده' }).click()
    await expect(page.getByText('شرکت تکنولوژی پارس')).toBeVisible()
    await expect(page.getByText('شرکت نوآوری دیجیتال')).not.toBeVisible()

    // Filter by pending status
    await page.getByRole('button', { name: 'در انتظار تأیید' }).click()
    await expect(page.getByText('شرکت تکنولوژی پارس')).not.toBeVisible()
    await expect(page.getByText('شرکت نوآوری دیجیتال')).toBeVisible()

    // Show all companies
    await page.getByRole('button', { name: 'همه' }).click()
    await expect(page.getByText('شرکت تکنولوژی پارس')).toBeVisible()
    await expect(page.getByText('شرکت نوآوری دیجیتال')).toBeVisible()
  })

  test('should approve pending company', async ({ page }) => {
    // Mock approve company API
    await page.route('**/api/admin/companies/2/approve', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'شرکت با موفقیت تأیید شد'
        })
      })
    })

    // Click approve button for pending company
    await page.locator('[data-testid="company-2"]').getByRole('button', { name: 'تأیید' }).click()

    // Confirmation dialog should appear
    await expect(page.getByText('آیا از تأیید این شرکت اطمینان دارید؟')).toBeVisible()

    // Confirm approval
    await page.getByRole('button', { name: 'بله، تأیید کن' }).click()

    // Should show success message
    await expect(page.getByText('شرکت با موفقیت تأیید شد')).toBeVisible()
  })

  test('should reject pending company', async ({ page }) => {
    // Mock reject company API
    await page.route('**/api/admin/companies/2/reject', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'شرکت رد شد'
        })
      })
    })

    // Click reject button for pending company
    await page.locator('[data-testid="company-2"]').getByRole('button', { name: 'رد' }).click()

    // Rejection dialog should appear
    await expect(page.getByText('دلیل رد درخواست')).toBeVisible()
    await page.getByPlaceholder('دلیل رد را وارد کنید').fill('مدارک ناقص')

    // Confirm rejection
    await page.getByRole('button', { name: 'رد کن' }).click()

    // Should show success message
    await expect(page.getByText('شرکت رد شد')).toBeVisible()
  })

  test('should view company details', async ({ page }) => {
    // Mock company details API
    await page.route('**/api/admin/companies/1/details', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          company: {
            id: 1,
            name: 'شرکت تکنولوژی پارس',
            email: 'info@parstech.com',
            phone: '02112345678',
            address: 'تهران، خیابان ولیعصر، پلاک ۱۲۳',
            registrationDate: '2024-01-01T00:00:00Z',
            status: 'approved'
          },
          employees: [
            {
              id: 1,
              name: 'احمد محمدی',
              email: 'ahmad@parstech.com',
              phone: '09123456789',
              joinDate: '2024-01-02T00:00:00Z'
            },
            {
              id: 2,
              name: 'فاطمه احمدی',
              email: 'fateme@parstech.com',
              phone: '09987654321',
              joinDate: '2024-01-03T00:00:00Z'
            }
          ],
          recentOrders: [
            {
              id: 1,
              date: '2024-01-15',
              total: 450000,
              status: 'delivered',
              itemCount: 10
            }
          ]
        })
      })
    })

    // Click view details button
    await page.locator('[data-testid="company-1"]').getByRole('button', { name: 'جزئیات' }).click()

    // Details modal should open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('جزئیات شرکت تکنولوژی پارس')).toBeVisible()

    // Check company information
    await expect(page.getByText('info@parstech.com')).toBeVisible()
    await expect(page.getByText('02112345678')).toBeVisible()
    await expect(page.getByText('تهران، خیابان ولیعصر، پلاک ۱۲۳')).toBeVisible()

    // Check employees list
    await expect(page.getByText('احمد محمدی')).toBeVisible()
    await expect(page.getByText('فاطمه احمدی')).toBeVisible()

    // Check recent orders
    await expect(page.getByText('۴۵۰,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('تحویل داده شده')).toBeVisible()
  })

  test('should search companies', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder('جستجوی شرکت...').fill('تکنولوژی')

    // Should show only matching companies
    await expect(page.getByText('شرکت تکنولوژی پارس')).toBeVisible()
    await expect(page.getByText('شرکت نوآوری دیجیتال')).not.toBeVisible()

    // Clear search
    await page.getByPlaceholder('جستجوی شرکت...').clear()

    // All companies should be visible again
    await expect(page.getByText('شرکت تکنولوژی پارس')).toBeVisible()
    await expect(page.getByText('شرکت نوآوری دیجیتال')).toBeVisible()
  })
})