import { test, expect } from '@playwright/test'

test.describe('Payment Process E2E Tests', () => {
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

    // Mock order data
    await page.route('**/api/orders/123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 123,
          total: 155000,
          status: 'pending_payment',
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
              quantity: 2,
              price: 55000
            }
          ],
          deliveryAddress: 'تهران، خیابان ولیعصر، پلاک ۱۲۳',
          deliveryTime: '12:00-13:00',
          createdAt: '2024-01-15T10:30:00Z'
        })
      })
    })

    await page.goto('/payment/123')
  })

  test('should display payment page correctly', async ({ page }) => {
    // Check page title
    await expect(page.getByText('پرداخت سفارش')).toBeVisible()

    // Check order summary
    await expect(page.getByText('خلاصه سفارش #۱۲۳')).toBeVisible()
    await expect(page.getByText('قورمه سبزی')).toBeVisible()
    await expect(page.getByText('کباب کوبیده')).toBeVisible()
    await expect(page.getByText('مجموع: ۱۵۵,۰۰۰ تومان')).toBeVisible()

    // Check delivery information
    await expect(page.getByText('آدرس تحویل:')).toBeVisible()
    await expect(page.getByText('تهران، خیابان ولیعصر، پلاک ۱۲۳')).toBeVisible()
    await expect(page.getByText('زمان تحویل: ۱۲:۰۰-۱۳:۰۰')).toBeVisible()

    // Check payment methods
    await expect(page.getByText('روش پرداخت')).toBeVisible()
    await expect(page.getByText('کارت بانکی')).toBeVisible()
    await expect(page.getByText('کیف پول')).toBeVisible()
    await expect(page.getByText('پرداخت در محل')).toBeVisible()
  })

  test('should process card payment successfully', async ({ page }) => {
    // Mock payment gateway
    await page.route('**/api/payments/card', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          transactionId: 'TXN123456789',
          redirectUrl: 'https://payment-gateway.com/pay/TXN123456789'
        })
      })
    })

    // Select card payment
    await page.getByRole('radio', { name: 'کارت بانکی' }).check()

    // Fill card information
    await page.getByPlaceholder('شماره کارت').fill('6037991234567890')
    await page.getByPlaceholder('MM/YY').fill('12/28')
    await page.getByPlaceholder('CVV').fill('123')
    await page.getByPlaceholder('نام دارنده کارت').fill('احمد محمدی')

    // Submit payment
    await page.getByRole('button', { name: 'پرداخت ۱۵۵,۰۰۰ تومان' }).click()

    // Should redirect to payment gateway (in real test, you'd mock this)
    await expect(page.getByText('در حال انتقال به درگاه پرداخت...')).toBeVisible()
  })

  test('should validate card information', async ({ page }) => {
    // Select card payment
    await page.getByRole('radio', { name: 'کارت بانکی' }).check()

    // Try to submit without filling card info
    await page.getByRole('button', { name: 'پرداخت ۱۵۵,۰۰۰ تومان' }).click()

    // Should show validation errors
    await expect(page.getByText('شماره کارت الزامی است')).toBeVisible()
    await expect(page.getByText('تاریخ انقضا الزامی است')).toBeVisible()
    await expect(page.getByText('کد CVV الزامی است')).toBeVisible()
    await expect(page.getByText('نام دارنده کارت الزامی است')).toBeVisible()
  })

  test('should validate card number format', async ({ page }) => {
    // Select card payment
    await page.getByRole('radio', { name: 'کارت بانکی' }).check()

    // Enter invalid card number
    await page.getByPlaceholder('شماره کارت').fill('1234')
    await page.getByPlaceholder('MM/YY').fill('12/28')
    await page.getByPlaceholder('CVV').fill('123')
    await page.getByPlaceholder('نام دارنده کارت').fill('احمد محمدی')

    // Submit payment
    await page.getByRole('button', { name: 'پرداخت ۱۵۵,۰۰۰ تومان' }).click()

    // Should show card number validation error
    await expect(page.getByText('شماره کارت معتبر نیست')).toBeVisible()
  })

  test('should process wallet payment', async ({ page }) => {
    // Mock wallet balance check
    await page.route('**/api/wallet/balance', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 200000
        })
      })
    })

    // Mock wallet payment
    await page.route('**/api/payments/wallet', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          transactionId: 'WALLET123456789',
          newBalance: 45000
        })
      })
    })

    // Select wallet payment
    await page.getByRole('radio', { name: 'کیف پول' }).check()

    // Should show wallet balance
    await expect(page.getByText('موجودی کیف پول: ۲۰۰,۰۰۰ تومان')).toBeVisible()

    // Submit payment
    await page.getByRole('button', { name: 'پرداخت از کیف پول' }).click()

    // Should show success message
    await expect(page.getByText('پرداخت با موفقیت انجام شد')).toBeVisible()
    await expect(page.getByText('موجودی جدید: ۴۵,۰۰۰ تومان')).toBeVisible()
  })

  test('should handle insufficient wallet balance', async ({ page }) => {
    // Mock insufficient wallet balance
    await page.route('**/api/wallet/balance', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 100000
        })
      })
    })

    // Select wallet payment
    await page.getByRole('radio', { name: 'کیف پول' }).check()

    // Should show insufficient balance warning
    await expect(page.getByText('موجودی کیف پول: ۱۰۰,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('موجودی کافی نیست')).toBeVisible()

    // Payment button should be disabled
    await expect(page.getByRole('button', { name: 'پرداخت از کیف پول' })).toBeDisabled()

    // Should show charge wallet option
    await expect(page.getByRole('button', { name: 'شارژ کیف پول' })).toBeVisible()
  })

  test('should select cash on delivery', async ({ page }) => {
    // Select cash on delivery
    await page.getByRole('radio', { name: 'پرداخت در محل' }).check()

    // Should show cash payment info
    await expect(page.getByText('مبلغ قابل پرداخت در محل: ۱۵۵,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('لطفاً مبلغ دقیق همراه داشته باشید')).toBeVisible()

    // Submit order
    await page.getByRole('button', { name: 'ثبت سفارش' }).click()

    // Should navigate to success page
    await expect(page).toHaveURL('/orders/success/123')
  })

  test('should handle payment failure', async ({ page }) => {
    // Mock payment failure
    await page.route('**/api/payments/card', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'کارت شما مسدود است'
        })
      })
    })

    // Select card payment and fill info
    await page.getByRole('radio', { name: 'کارت بانکی' }).check()
    await page.getByPlaceholder('شماره کارت').fill('6037991234567890')
    await page.getByPlaceholder('MM/YY').fill('12/28')
    await page.getByPlaceholder('CVV').fill('123')
    await page.getByPlaceholder('نام دارنده کارت').fill('احمد محمدی')

    // Submit payment
    await page.getByRole('button', { name: 'پرداخت ۱۵۵,۰۰۰ تومان' }).click()

    // Should show error message
    await expect(page.getByText('کارت شما مسدود است')).toBeVisible()

    // Should show retry option
    await expect(page.getByRole('button', { name: 'تلاش مجدد' })).toBeVisible()
  })

  test('should apply discount code during payment', async ({ page }) => {
    // Mock discount validation
    await page.route('**/api/discounts/validate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          discount: 25000,
          code: 'SAVE20',
          newTotal: 130000
        })
      })
    })

    // Enter discount code
    await page.getByPlaceholder('کد تخفیف').fill('SAVE20')
    await page.getByRole('button', { name: 'اعمال' }).click()

    // Should show updated total
    await expect(page.getByText('تخفیف: ۲۵,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('مجموع نهایی: ۱۳۰,۰۰۰ تومان')).toBeVisible()

    // Payment button should show new amount
    await expect(page.getByRole('button', { name: 'پرداخت ۱۳۰,۰۰۰ تومان' })).toBeVisible()
  })

  test('should show payment history', async ({ page }) => {
    // Mock payment history
    await page.route('**/api/payments/history', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payments: [
            {
              id: 1,
              orderId: 120,
              amount: 85000,
              method: 'card',
              status: 'completed',
              transactionId: 'TXN987654321',
              createdAt: '2024-01-14T15:30:00Z'
            },
            {
              id: 2,
              orderId: 121,
              amount: 120000,
              method: 'wallet',
              status: 'completed',
              transactionId: 'WALLET987654321',
              createdAt: '2024-01-13T12:15:00Z'
            }
          ]
        })
      })
    })

    // Navigate to payment history
    await page.goto('/payment/history')

    // Check page title
    await expect(page.getByText('تاریخچه پرداخت‌ها')).toBeVisible()

    // Check payment records
    await expect(page.getByText('سفارش #۱۲۰')).toBeVisible()
    await expect(page.getByText('سفارش #۱۲۱')).toBeVisible()
    await expect(page.getByText('۸۵,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('۱۲۰,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('کارت بانکی')).toBeVisible()
    await expect(page.getByText('کیف پول')).toBeVisible()
    await expect(page.getByText('موفق')).toBeVisible()
  })
})

test.describe('Wallet Management E2E Tests', () => {
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

    // Mock wallet data
    await page.route('**/api/wallet', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 150000,
          transactions: [
            {
              id: 1,
              type: 'charge',
              amount: 200000,
              description: 'شارژ کیف پول',
              status: 'completed',
              createdAt: '2024-01-14T10:00:00Z'
            },
            {
              id: 2,
              type: 'payment',
              amount: -50000,
              description: 'پرداخت سفارش #120',
              status: 'completed',
              createdAt: '2024-01-14T12:30:00Z'
            }
          ]
        })
      })
    })

    await page.goto('/wallet')
  })

  test('should display wallet page correctly', async ({ page }) => {
    // Check page title
    await expect(page.getByText('کیف پول من')).toBeVisible()

    // Check wallet balance
    await expect(page.getByText('موجودی فعلی')).toBeVisible()
    await expect(page.getByText('۱۵۰,۰۰۰ تومان')).toBeVisible()

    // Check action buttons
    await expect(page.getByRole('button', { name: 'شارژ کیف پول' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'برداشت از کیف پول' })).toBeVisible()

    // Check transaction history
    await expect(page.getByText('تاریخچه تراکنش‌ها')).toBeVisible()
    await expect(page.getByText('شارژ کیف پول')).toBeVisible()
    await expect(page.getByText('پرداخت سفارش #120')).toBeVisible()
    await expect(page.getByText('+۲۰۰,۰۰۰ تومان')).toBeVisible()
    await expect(page.getByText('-۵۰,۰۰۰ تومان')).toBeVisible()
  })

  test('should charge wallet successfully', async ({ page }) => {
    // Mock charge wallet API
    await page.route('**/api/wallet/charge', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          newBalance: 250000,
          transactionId: 'CHARGE123456789'
        })
      })
    })

    // Click charge wallet button
    await page.getByRole('button', { name: 'شارژ کیف پول' }).click()

    // Charge modal should open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('شارژ کیف پول')).toBeVisible()

    // Select charge amount
    await page.getByRole('button', { name: '۱۰۰,۰۰۰ تومان' }).click()

    // Or enter custom amount
    await page.getByPlaceholder('مبلغ دلخواه').fill('100000')

    // Select payment method
    await page.getByRole('radio', { name: 'کارت بانکی' }).check()

    // Submit charge request
    await page.getByRole('button', { name: 'شارژ' }).click()

    // Should show success message
    await expect(page.getByText('کیف پول با موفقیت شارژ شد')).toBeVisible()
    await expect(page.getByText('موجودی جدید: ۲۵۰,۰۰۰ تومان')).toBeVisible()
  })

  test('should validate charge amount', async ({ page }) => {
    // Click charge wallet button
    await page.getByRole('button', { name: 'شارژ کیف پول' }).click()

    // Try to submit without selecting amount
    await page.getByRole('button', { name: 'شارژ' }).click()

    // Should show validation error
    await expect(page.getByText('مبلغ شارژ الزامی است')).toBeVisible()

    // Enter invalid amount (too low)
    await page.getByPlaceholder('مبلغ دلخواه').fill('5000')
    await page.getByRole('button', { name: 'شارژ' }).click()

    // Should show minimum amount error
    await expect(page.getByText('حداقل مبلغ شارژ ۱۰,۰۰۰ تومان است')).toBeVisible()
  })

  test('should withdraw from wallet', async ({ page }) => {
    // Mock withdraw API
    await page.route('**/api/wallet/withdraw', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          newBalance: 100000,
          transactionId: 'WITHDRAW123456789'
        })
      })
    })

    // Click withdraw button
    await page.getByRole('button', { name: 'برداشت از کیف پول' }).click()

    // Withdraw modal should open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('برداشت از کیف پول')).toBeVisible()

    // Enter withdraw amount
    await page.getByPlaceholder('مبلغ برداشت').fill('50000')

    // Enter bank account info
    await page.getByPlaceholder('شماره کارت مقصد').fill('6037991234567890')
    await page.getByPlaceholder('نام دارنده کارت').fill('احمد محمدی')

    // Submit withdraw request
    await page.getByRole('button', { name: 'درخواست برداشت' }).click()

    // Should show success message
    await expect(page.getByText('درخواست برداشت ثبت شد')).toBeVisible()
    await expect(page.getByText('مبلغ ظرف ۲۴ ساعت به حساب شما واریز می‌شود')).toBeVisible()
  })

  test('should validate withdraw amount', async ({ page }) => {
    // Click withdraw button
    await page.getByRole('button', { name: 'برداشت از کیف پول' }).click()

    // Enter amount higher than balance
    await page.getByPlaceholder('مبلغ برداشت').fill('200000')
    await page.getByPlaceholder('شماره کارت مقصد').fill('6037991234567890')
    await page.getByPlaceholder('نام دارنده کارت').fill('احمد محمدی')

    // Submit withdraw request
    await page.getByRole('button', { name: 'درخواست برداشت' }).click()

    // Should show insufficient balance error
    await expect(page.getByText('موجودی کافی نیست')).toBeVisible()
  })

  test('should filter transaction history', async ({ page }) => {
    // Initially all transactions should be visible
    await expect(page.getByText('شارژ کیف پول')).toBeVisible()
    await expect(page.getByText('پرداخت سفارش #120')).toBeVisible()

    // Filter by charge transactions
    await page.getByRole('button', { name: 'شارژ' }).click()
    await expect(page.getByText('شارژ کیف پول')).toBeVisible()
    await expect(page.getByText('پرداخت سفارش #120')).not.toBeVisible()

    // Filter by payment transactions
    await page.getByRole('button', { name: 'پرداخت' }).click()
    await expect(page.getByText('شارژ کیف پول')).not.toBeVisible()
    await expect(page.getByText('پرداخت سفارش #120')).toBeVisible()

    // Show all transactions
    await page.getByRole('button', { name: 'همه' }).click()
    await expect(page.getByText('شارژ کیف پول')).toBeVisible()
    await expect(page.getByText('پرداخت سفارش #120')).toBeVisible()
  })
})