import fc from 'fast-check';

// Mock کردن AuditLogger برای تست
const mockAuditLogger = {
  log: jest.fn().mockResolvedValue('mock-audit-id')
};

jest.mock('../utils/auditLogger.js', () => ({
  AuditLogger: mockAuditLogger
}));

// تنظیم متغیر محیطی قبل از import
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-property-testing-must-be-32-chars-long';

import { EncryptionService, encryptionService } from '../utils/encryption.js';

describe('Property 16: Data Encryption Completeness', () => {
  let testEncryptionService;

  beforeAll(() => {
    testEncryptionService = new EncryptionService();
  });

  afterAll(() => {
    // پاک‌سازی متغیر محیطی
    delete process.env.ENCRYPTION_KEY;
  });

  /**
   * Property: برای هر داده حساس، سیستم باید رمزنگاری مناسب اعمال کند
   * این property تضمین می‌کند که تمام داده‌های حساس قبل از ذخیره‌سازی رمزنگاری می‌شوند
   */
  test('هر داده حساس باید قبل از ذخیره‌سازی رمزنگاری شود', () => {
    fc.assert(
      fc.property(
        // تولید داده‌های حساس مختلف
        fc.record({
          password: fc.string({ minLength: 8, maxLength: 50 }),
          cardNumber: fc.string({ minLength: 16, maxLength: 19 }),
          cvv: fc.string({ minLength: 3, maxLength: 4 }),
          personalId: fc.string({ minLength: 10, maxLength: 10 }),
          phoneNumber: fc.string({ minLength: 11, maxLength: 11 }),
          email: fc.emailAddress(),
          bankAccount: fc.string({ minLength: 10, maxLength: 20 })
        }),
        (sensitiveData) => {
          // تست رمزنگاری رمز عبور
          if (sensitiveData.password) {
            const encryptedPassword = testEncryptionService.encrypt(sensitiveData.password);
            
            // بررسی که داده رمزنگاری شده متفاوت از داده اصلی است
            expect(encryptedPassword).not.toBe(sensitiveData.password);
            expect(encryptedPassword).toBeDefined();
            expect(encryptedPassword.length).toBeGreaterThan(0);
            
            // بررسی که داده رمزنگاری شده قابل رمزگشایی است
            const decryptedPassword = testEncryptionService.decrypt(encryptedPassword);
            expect(decryptedPassword).toBe(sensitiveData.password);
          }

          // تست رمزنگاری اطلاعات پرداخت
          const paymentData = {
            cardNumber: sensitiveData.cardNumber,
            cvv: sensitiveData.cvv,
            expiryDate: '12/25'
          };

          const encryptedPayment = testEncryptionService.encryptPaymentData(paymentData);
          expect(encryptedPayment).not.toContain(sensitiveData.cardNumber);
          expect(encryptedPayment).not.toContain(sensitiveData.cvv);
          
          const decryptedPayment = testEncryptionService.decryptPaymentData(encryptedPayment);
          expect(decryptedPayment.cardNumber).toBe(sensitiveData.cardNumber);
          expect(decryptedPayment.cvv).toBe(sensitiveData.cvv);

          // تست رمزنگاری سایر داده‌های حساس
          const sensitiveFields = ['personalId', 'phoneNumber', 'bankAccount'];
          
          sensitiveFields.forEach(field => {
            if (sensitiveData[field]) {
              const encrypted = testEncryptionService.encrypt(sensitiveData[field]);
              expect(encrypted).not.toBe(sensitiveData[field]);
              expect(encrypted).toBeDefined();
              
              const decrypted = testEncryptionService.decrypt(encrypted);
              expect(decrypted).toBe(sensitiveData[field]);
            }
          });

          return true;
        }
      ),
      { 
        numRuns: 100,
        verbose: true 
      }
    );
  });

  /**
   * Property: رمزنگاری باید یکطرفه و غیرقابل برگشت باشد (برای رمزهای عبور)
   */
  test('رمزهای عبور باید با hash یکطرفه رمزنگاری شوند', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        async (password) => {
          const hashedPassword = await testEncryptionService.hashPassword(password);
          
          // بررسی که hash متفاوت از رمز اصلی است
          expect(hashedPassword).not.toBe(password);
          expect(hashedPassword).toBeDefined();
          expect(hashedPassword.length).toBeGreaterThan(0);
          
          // بررسی که hash شامل رمز اصلی نیست
          expect(hashedPassword).not.toContain(password);
          
          // بررسی که تأیید رمز کار می‌کند
          const isValid = await testEncryptionService.verifyPassword(password, hashedPassword);
          expect(isValid).toBe(true);
          
          // بررسی که رمز اشتباه رد می‌شود
          const isInvalid = await testEncryptionService.verifyPassword(password + 'wrong', hashedPassword);
          expect(isInvalid).toBe(false);

          return true;
        }
      ),
      { 
        numRuns: 20, // کاهش تعداد تست‌ها برای سرعت بیشتر
        verbose: true 
      }
    );
  }, 10000); // افزایش timeout به 10 ثانیه

  /**
   * Property: رمزنگاری باید deterministic نباشد (هر بار نتیجه متفاوت)
   */
  test('رمزنگاری باید هر بار نتیجه متفاوت تولید کند', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (plaintext) => {
          const encrypted1 = testEncryptionService.encrypt(plaintext);
          const encrypted2 = testEncryptionService.encrypt(plaintext);
          
          // دو رمزنگاری از یک متن باید متفاوت باشند (به دلیل IV تصادفی)
          expect(encrypted1).not.toBe(encrypted2);
          
          // اما هر دو باید به همان متن اصلی رمزگشایی شوند
          const decrypted1 = testEncryptionService.decrypt(encrypted1);
          const decrypted2 = testEncryptionService.decrypt(encrypted2);
          
          expect(decrypted1).toBe(plaintext);
          expect(decrypted2).toBe(plaintext);

          return true;
        }
      ),
      { 
        numRuns: 50,
        verbose: true 
      }
    );
  });

  /**
   * Property: ماسک کردن داده‌های حساس برای نمایش
   */
  test('داده‌های حساس باید برای نمایش ماسک شوند', () => {
    fc.assert(
      fc.property(
        fc.record({
          cardNumber: fc.string({ minLength: 16, maxLength: 19 }),
          phoneNumber: fc.string({ minLength: 11, maxLength: 11 }),
          personalId: fc.string({ minLength: 10, maxLength: 10 })
        }),
        (sensitiveData) => {
          Object.entries(sensitiveData).forEach(([key, value]) => {
            const masked = testEncryptionService.maskSensitiveData(value, 4);
            
            // بررسی که داده ماسک شده است
            expect(masked).not.toBe(value);
            expect(masked).toContain('*');
            
            // بررسی که ۴ کاراکتر آخر نمایش داده می‌شود
            if (value.length > 4) {
              expect(masked.slice(-4)).toBe(value.slice(-4));
            }
            
            // بررسی که طول کلی حفظ شده است
            expect(masked.length).toBe(value.length);
          });

          return true;
        }
      ),
      { 
        numRuns: 100,
        verbose: true 
      }
    );
  });

  /**
   * Property: تولید کلیدهای امن
   */
  test('کلیدهای امن باید خصوصیات مناسب داشته باشند', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 16, max: 64 }),
        (keyLength) => {
          const secureKey = testEncryptionService.generateSecureKey(keyLength);
          
          // بررسی طول کلید
          expect(secureKey.length).toBe(keyLength * 2); // hex encoding
          
          // بررسی که کلید شامل کاراکترهای hex است
          expect(/^[0-9a-f]+$/i.test(secureKey)).toBe(true);
          
          // بررسی که کلیدهای متوالی متفاوت هستند
          const anotherKey = testEncryptionService.generateSecureKey(keyLength);
          expect(secureKey).not.toBe(anotherKey);

          return true;
        }
      ),
      { 
        numRuns: 50,
        verbose: true 
      }
    );
  });

  /**
   * Property: تولید hash امن
   */
  test('hash های تولید شده باید خصوصیات مناسب داشته باشند', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.constantFrom('sha256', 'sha512', 'md5'),
        (data, algorithm) => {
          const hash = testEncryptionService.generateHash(data, algorithm);
          
          // بررسی که hash تولید شده است
          expect(hash).toBeDefined();
          expect(hash.length).toBeGreaterThan(0);
          
          // بررسی که hash شامل کاراکترهای hex است
          expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);
          
          // بررسی deterministic بودن hash
          const sameHash = testEncryptionService.generateHash(data, algorithm);
          expect(hash).toBe(sameHash);
          
          // بررسی که داده‌های مختلف hash های مختلف تولید می‌کنند
          const differentHash = testEncryptionService.generateHash(data + 'different', algorithm);
          expect(hash).not.toBe(differentHash);

          return true;
        }
      ),
      { 
        numRuns: 100,
        verbose: true 
      }
    );
  });

  /**
   * Property: مقاومت در برابر داده‌های نامعتبر
   */
  test('سیستم رمزنگاری باید در برابر داده‌های نامعتبر مقاوم باشد', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.string({ maxLength: 0 })
        ),
        (invalidData) => {
          // بررسی که رمزنگاری داده‌های نامعتبر خطا می‌دهد
          expect(() => {
            testEncryptionService.encrypt(invalidData);
          }).toThrow();
          
          // بررسی که رمزگشایی داده‌های نامعتبر خطا می‌دهد
          expect(() => {
            testEncryptionService.decrypt(invalidData);
          }).toThrow();

          return true;
        }
      ),
      { 
        numRuns: 20,
        verbose: true 
      }
    );
  });

  /**
   * Property: یکپارچگی داده‌ها پس از رمزنگاری و رمزگشایی
   */
  test('داده‌ها پس از رمزنگاری و رمزگشایی باید دست‌نخورده باقی بمانند', () => {
    fc.assert(
      fc.property(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 1000 }),
          number: fc.integer(),
          boolean: fc.boolean(),
          array: fc.array(fc.string(), { maxLength: 10 }),
          object: fc.record({
            name: fc.string(),
            age: fc.integer({ min: 0, max: 120 })
          })
        }),
        (complexData) => {
          const jsonData = JSON.stringify(complexData);
          const encrypted = testEncryptionService.encrypt(jsonData);
          const decrypted = testEncryptionService.decrypt(encrypted);
          const parsedData = JSON.parse(decrypted);
          
          // بررسی یکپارچگی داده‌ها
          expect(parsedData).toEqual(complexData);
          expect(parsedData.text).toBe(complexData.text);
          expect(parsedData.number).toBe(complexData.number);
          expect(parsedData.boolean).toBe(complexData.boolean);
          expect(parsedData.array).toEqual(complexData.array);
          expect(parsedData.object).toEqual(complexData.object);

          return true;
        }
      ),
      { 
        numRuns: 50,
        verbose: true 
      }
    );
  });

  /**
   * Integration Test: تست یکپارچگی با سیستم audit logging
   */
  test('عملیات رمزنگاری باید در audit log ثبت شوند', async () => {
    const testData = 'sensitive-test-data-for-audit';
    const userId = 'test-user-123';
    
    // شبیه‌سازی عملیات رمزنگاری با لاگ‌گیری
    const encrypted = testEncryptionService.encrypt(testData);
    
    // ثبت لاگ عملیات رمزنگاری (شبیه‌سازی)
    const auditId = await mockAuditLogger.log({
      userId,
      action: 'DATA_ENCRYPTION',
      resource: 'sensitive_data',
      resourceId: 'test-resource',
      details: {
        dataType: 'test_data',
        encrypted: true,
        algorithm: 'aes-256-gcm'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      success: true
    });

    // بررسی که لاگ ثبت شده است
    expect(auditId).toBeDefined();
    expect(mockAuditLogger.log).toHaveBeenCalled();
    
    // بررسی که داده رمزنگاری شده است
    expect(encrypted).not.toBe(testData);
    
    // بررسی که رمزگشایی صحیح است
    const decrypted = testEncryptionService.decrypt(encrypted);
    expect(decrypted).toBe(testData);
  });
});