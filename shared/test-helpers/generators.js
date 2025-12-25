import fc from 'fast-check';

// Custom generators for property-based testing

export const userGenerator = () => fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  firstName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => /^[a-zA-Z\u0600-\u06FF\s]+$/.test(s)),
  lastName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => /^[a-zA-Z\u0600-\u06FF\s]+$/.test(s)),
  phone: fc.constantFrom('09123456789', '09987654321', '+989123456789'),
  userType: fc.constantFrom('individual', 'company_admin', 'catering_manager', 'employee'),
  isActive: fc.boolean(),
  companyId: fc.option(fc.uuid()),
});

export const companyGenerator = () => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 100 }),
  registrationNumber: fc.string({ minLength: 10, maxLength: 20 }),
  address: fc.string({ minLength: 10, maxLength: 200 }),
  contactPerson: fc.string({ minLength: 5, maxLength: 100 }),
  email: fc.emailAddress(),
  phone: fc.constantFrom('09123456789', '09987654321', '+989123456789'),
  status: fc.constantFrom('pending', 'approved', 'rejected'),
  adminUserId: fc.uuid(),
});

export const foodItemGenerator = () => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  category: fc.constantFrom('main_course', 'appetizer', 'dessert', 'beverage', 'salad'),
  basePrice: fc.integer({ min: 10000, max: 500000 }), // Price in Rials
  imageUrl: fc.option(fc.webUrl()),
  ingredients: fc.array(fc.string({ minLength: 2, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
  allergens: fc.array(fc.constantFrom('nuts', 'dairy', 'gluten', 'eggs', 'seafood'), { maxLength: 5 }),
  isActive: fc.boolean(),
});

export const orderGenerator = () => fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  companyId: fc.option(fc.uuid()),
  orderDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  deliveryDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  items: fc.array(fc.record({
    foodItemId: fc.uuid(),
    quantity: fc.integer({ min: 1, max: 10 }),
    unitPrice: fc.integer({ min: 10000, max: 500000 }),
    totalPrice: fc.integer({ min: 10000, max: 5000000 }),
  }), { minLength: 1, maxLength: 5 }),
  totalAmount: fc.integer({ min: 10000, max: 5000000 }),
  discountAmount: fc.integer({ min: 0, max: 1000000 }),
  finalAmount: fc.integer({ min: 10000, max: 5000000 }),
  status: fc.constantFrom('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
  paymentStatus: fc.constantFrom('pending', 'paid', 'failed', 'refunded'),
  notes: fc.option(fc.string({ maxLength: 500 })),
});

export const paymentGenerator = () => fc.record({
  id: fc.uuid(),
  orderId: fc.uuid(),
  amount: fc.integer({ min: 10000, max: 5000000 }),
  method: fc.constantFrom('credit_card', 'bank_transfer', 'wallet'),
  status: fc.constantFrom('pending', 'completed', 'failed', 'refunded'),
  transactionId: fc.option(fc.string({ minLength: 10, maxLength: 50 })),
  gatewayResponse: fc.option(fc.object()),
});

export const validPasswordGenerator = () => 
  fc.string({ minLength: 8, maxLength: 50 })
    .filter(s => /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s));

export const iranianPhoneGenerator = () => 
  fc.constantFrom(
    '09123456789', '09987654321', '09351234567', '09123456789',
    '+989123456789', '+989987654321', '+989351234567'
  );