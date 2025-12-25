import { test, expect } from '@playwright/test'

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto('/login')
  })

  test('should display login page correctly', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/تدبیرخوان/)

    // Check if main elements are visible
    await expect(page.getByText('تدبیرخوان')).toBeVisible()
    await expect(page.getByText('ورود به حساب کاربری')).toBeVisible()
    await expect(page.getByPlaceholder('ایمیل خود را وارد کنید')).toBeVisible()
    await expect(page.getByPlaceholder('رمز عبور خود را وارد کنید')).toBeVisible()
    await expect(page.getByRole('button', { name: /ورود/i })).toBeVisible()
  })

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Click submit button without filling the form
    await page.getByRole('button', { name: /ورود/i }).click()

    // Check for validation error messages
    await expect(page.getByText('ایمیل الزامی است')).toBeVisible()
    await expect(page.getByText('رمز عبور الزامی است')).toBeVisible()
  })

  test('should show validation error for invalid email format', async ({ page }) => {
    // Fill invalid email
    await page.getByPlaceholder('ایمیل خود را وارد کنید').fill('invalid-email')
    await page.getByPlaceholder('رمز عبور خود را وارد کنید').fill('password123')
    
    // Submit form
    await page.getByRole('button', { name: /ورود/i }).click()

    // Check for email validation error
    await expect(page.getByText('ایمیل معتبر وارد کنید')).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('رمز عبور خود را وارد کنید')
    const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1)

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click toggle button to show password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')

    // Click again to hide password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('should navigate to register page', async ({ page }) => {
    // Click on register link
    await page.getByRole('link', { name: 'ثبت‌نام' }).click()

    // Should navigate to register page
    await expect(page).toHaveURL('/register')
    await expect(page.getByText('ثبت‌نام')).toBeVisible()
  })

  test('should navigate to forgot password page', async ({ page }) => {
    // Click on forgot password link
    await page.getByRole('link', { name: 'رمز عبور را فراموش کرده‌اید؟' }).click()

    // Should navigate to forgot password page
    await expect(page).toHaveURL('/forgot-password')
  })

  test('should navigate to employee registration page', async ({ page }) => {
    // Click on employee registration link
    await page.getByRole('link', { name: 'با کد شرکت ثبت‌نام کنید' }).click()

    // Should navigate to employee registration page
    await expect(page).toHaveURL('/register/employee')
  })

  test('should handle login attempt with mock data', async ({ page }) => {
    // Mock the API response for login
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'ایمیل یا رمز عبور اشتباه است'
        })
      })
    })

    // Fill login form
    await page.getByPlaceholder('ایمیل خود را وارد کنید').fill('test@example.com')
    await page.getByPlaceholder('رمز عبور خود را وارد کنید').fill('wrongpassword')
    
    // Submit form
    await page.getByRole('button', { name: /ورود/i }).click()

    // Should show error message (this would be shown via toast)
    // Note: In a real test, you'd check for the actual error display mechanism
  })
})

test.describe('Registration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('should display registration page correctly', async ({ page }) => {
    await expect(page.getByText('ثبت‌نام')).toBeVisible()
    await expect(page.getByText('حساب کاربری جدید ایجاد کنید')).toBeVisible()
    
    // Check user type selection
    await expect(page.getByText('کاربر عادی')).toBeVisible()
    await expect(page.getByText('شرکت')).toBeVisible()
    
    // Check form fields
    await expect(page.getByPlaceholder('نام خود را وارد کنید')).toBeVisible()
    await expect(page.getByPlaceholder('ایمیل خود را وارد کنید')).toBeVisible()
    await expect(page.getByPlaceholder('09123456789')).toBeVisible()
  })

  test('should switch between individual and company registration', async ({ page }) => {
    // Initially individual user should be selected
    const individualRadio = page.locator('input[value="individual"]')
    const companyRadio = page.locator('input[value="company"]')
    
    await expect(individualRadio).toBeChecked()
    
    // Click on company registration
    await page.getByText('شرکت').click()
    await expect(companyRadio).toBeChecked()
    
    // Should show company-specific fields
    await expect(page.getByPlaceholder('نام شرکت را وارد کنید')).toBeVisible()
    await expect(page.getByPlaceholder('آدرس کامل شرکت را وارد کنید')).toBeVisible()
    await expect(page.getByPlaceholder('02112345678')).toBeVisible()
    
    // Switch back to individual
    await page.getByText('کاربر عادی').click()
    await expect(individualRadio).toBeChecked()
    
    // Company fields should be hidden
    await expect(page.getByPlaceholder('نام شرکت را وارد کنید')).not.toBeVisible()
  })

  test('should show validation errors for empty registration form', async ({ page }) => {
    // Submit empty form
    await page.getByRole('button', { name: /ثبت‌نام/i }).click()

    // Check for validation errors
    await expect(page.getByText('نام الزامی است')).toBeVisible()
    await expect(page.getByText('ایمیل الزامی است')).toBeVisible()
    await expect(page.getByText('شماره موبایل الزامی است')).toBeVisible()
    await expect(page.getByText('رمز عبور الزامی است')).toBeVisible()
  })

  test('should validate password confirmation', async ({ page }) => {
    // Fill form with mismatched passwords
    await page.getByPlaceholder('نام خود را وارد کنید').fill('احمد محمدی')
    await page.getByPlaceholder('ایمیل خود را وارد کنید').fill('ahmad@example.com')
    await page.getByPlaceholder('09123456789').fill('09123456789')
    await page.getByPlaceholder('رمز عبور خود را وارد کنید').fill('password123')
    await page.getByPlaceholder('رمز عبور را مجدداً وارد کنید').fill('differentpassword')
    
    // Submit form
    await page.getByRole('button', { name: /ثبت‌نام/i }).click()

    // Should show password mismatch error
    await expect(page.getByText('تکرار رمز عبور مطابقت ندارد')).toBeVisible()
  })

  test('should navigate back to login page', async ({ page }) => {
    // Click on login link
    await page.getByRole('link', { name: 'وارد شوید' }).click()

    // Should navigate to login page
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('ورود به حساب کاربری')).toBeVisible()
  })
})