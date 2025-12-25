import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { 
  User, Company, Employee, FoodCategory, FoodItem, 
  DailyMenu, MenuItem, sequelize 
} from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('seed-data');

/**
 * کلاس Seeding داده‌ها برای محیط development
 */
class DatabaseSeeder {
  constructor() {
    this.createdData = {
      users: [],
      companies: [],
      employees: [],
      categories: [],
      foodItems: [],
      dailyMenus: [],
      menuItems: []
    };
  }

  /**
   * اجرای کامل seeding
   */
  async run() {
    try {
      logger.info('🌱 شروع seeding داده‌ها...');

      await this.createUsers();
      await this.createCompanies();
      await this.createEmployees();
      await this.createFoodCategories();
      await this.createFoodItems();
      await this.createDailyMenus();
      await this.createMenuItems();

      logger.info('✅ Seeding داده‌ها با موفقیت تکمیل شد');
      this.logSummary();

    } catch (error) {
      logger.error('❌ خطا در seeding داده‌ها', { error: error.message });
      throw error;
    }
  }

  /**
   * ایجاد کاربران نمونه
   */
  async createUsers() {
    logger.info('👥 ایجاد کاربران نمونه...');

    // مدیر کترینگ
    const cateringManager = await User.create({
      email: 'manager@tadbirkhowan.com',
      password_hash: await bcrypt.hash('manager123', 12),
      first_name: 'علی',
      last_name: 'احمدی',
      phone: '09121234567',
      user_type: 'catering_manager',
      status: 'active',
      email_verified: true
    });
    this.createdData.users.push(cateringManager);

    // مدیران شرکت
    for (let i = 0; i < 5; i++) {
      const companyAdmin = await User.create({
        email: faker.internet.email(),
        password_hash: await bcrypt.hash('admin123', 12),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        phone: faker.phone.number('091########'),
        user_type: 'company_admin',
        status: 'active',
        email_verified: true
      });
      this.createdData.users.push(companyAdmin);
    }

    // کاربران عادی
    for (let i = 0; i < 20; i++) {
      const individualUser = await User.create({
        email: faker.internet.email(),
        password_hash: await bcrypt.hash('user123', 12),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        phone: faker.phone.number('091########'),
        user_type: 'individual_user',
        status: 'active',
        email_verified: true
      });
      this.createdData.users.push(individualUser);
    }

    logger.info(`✅ ${this.createdData.users.length} کاربر ایجاد شد`);
  }

  /**
   * ایجاد شرکت‌های نمونه
   */
  async createCompanies() {
    logger.info('🏢 ایجاد شرکت‌های نمونه...');

    const companyAdmins = this.createdData.users.filter(u => u.user_type === 'company_admin');
    const cateringManager = this.createdData.users.find(u => u.user_type === 'catering_manager');

    for (let i = 0; i < companyAdmins.length; i++) {
      const admin = companyAdmins[i];
      const company = await Company.create({
        name: faker.company.name(),
        registration_number: faker.string.numeric(10),
        tax_id: faker.string.numeric(11),
        address: faker.location.streetAddress(),
        city: faker.helpers.arrayElement(['تهران', 'اصفهان', 'مشهد', 'شیراز', 'تبریز']),
        postal_code: faker.string.numeric(10),
        phone: faker.phone.number('021########'),
        email: faker.internet.email(),
        website: faker.internet.url(),
        company_code: Company.generateCompanyCode(faker.company.name()),
        admin_user_id: admin.id,
        status: i < 3 ? 'approved' : 'pending',
        approved_by: i < 3 ? cateringManager.id : null,
        approved_at: i < 3 ? new Date() : null,
        employee_count: 0,
        max_employees: faker.number.int({ min: 10, max: 100 }),
        subscription_plan: faker.helpers.arrayElement(['basic', 'premium', 'enterprise'])
      });
      this.createdData.companies.push(company);
    }

    logger.info(`✅ ${this.createdData.companies.length} شرکت ایجاد شد`);
  }

  /**
   * ایجاد کارمندان نمونه
   */
  async createEmployees() {
    logger.info('👨‍💼 ایجاد کارمندان نمونه...');

    const approvedCompanies = this.createdData.companies.filter(c => c.status === 'approved');
    const individualUsers = this.createdData.users.filter(u => u.user_type === 'individual_user');

    let employeeIndex = 0;
    for (const company of approvedCompanies) {
      const employeeCount = faker.number.int({ min: 3, max: 8 });
      
      for (let i = 0; i < employeeCount && employeeIndex < individualUsers.length; i++) {
        const user = individualUsers[employeeIndex];
        const employee = await Employee.create({
          user_id: user.id,
          company_id: company.id,
          employee_code: `EMP${String(employeeIndex + 1).padStart(4, '0')}`,
          first_name: user.first_name,
          last_name: user.last_name,
          department: faker.helpers.arrayElement(['IT', 'مالی', 'منابع انسانی', 'فروش', 'بازاریابی']),
          position: faker.person.jobTitle(),
          hire_date: faker.date.past({ years: 2 }),
          status: 'active',
          added_by: company.admin_user_id
        });
        this.createdData.employees.push(employee);
        employeeIndex++;

        // به‌روزرسانی تعداد کارمندان شرکت
        await company.incrementEmployeeCount();
      }
    }

    logger.info(`✅ ${this.createdData.employees.length} کارمند ایجاد شد`);
  }

  /**
   * ایجاد دسته‌بندی‌های غذا
   */
  async createFoodCategories() {
    logger.info('🍽️ ایجاد دسته‌بندی‌های غذا...');

    const cateringManager = this.createdData.users.find(u => u.user_type === 'catering_manager');
    
    const categories = [
      { name: 'غذاهای اصلی', type: 'main_course', description: 'غذاهای اصلی و پرطرفدار' },
      { name: 'پیش غذا', type: 'appetizer', description: 'انواع پیش غذا و مزه' },
      { name: 'دسر', type: 'dessert', description: 'انواع دسر و شیرینی' },
      { name: 'نوشیدنی', type: 'beverage', description: 'انواع نوشیدنی گرم و سرد' },
      { name: 'غذای جانبی', type: 'side_dish', description: 'غذاهای جانبی و سالاد' }
    ];

    for (let i = 0; i < categories.length; i++) {
      const categoryData = categories[i];
      const category = await FoodCategory.create({
        ...categoryData,
        sort_order: i + 1,
        status: 'active',
        created_by: cateringManager.id
      });
      this.createdData.categories.push(category);
    }

    logger.info(`✅ ${this.createdData.categories.length} دسته‌بندی غذا ایجاد شد`);
  }

  /**
   * ایجاد غذاهای نمونه
   */
  async createFoodItems() {
    logger.info('🍛 ایجاد غذاهای نمونه...');

    const cateringManager = this.createdData.users.find(u => u.user_type === 'catering_manager');
    
    const foodsByCategory = {
      'غذاهای اصلی': [
        'قورمه سبزی با برنج', 'فسنجان با برنج', 'قیمه با برنج', 'کباب کوبیده',
        'جوجه کباب', 'ماهی شکم پر', 'خورشت بامیه', 'آش رشته'
      ],
      'پیش غذا': [
        'کاشک بادمجان', 'میرزا قاسمی', 'سالاد شیرازی', 'ماست و خیار',
        'زیتون پرورده', 'پنیر و گردو', 'کوکو سبزی', 'بورانی اسفناج'
      ],
      'دسر': [
        'فالوده شیرازی', 'بستنی سنتی', 'شله زرد', 'حلوا هویج',
        'کیک یزدی', 'باقلوا', 'زولبیا و بامیه', 'فرنی'
      ],
      'نوشیدنی': [
        'چای سنتی', 'قهوه ترک', 'دوغ', 'آب آلبالو',
        'شربت بهار نارنج', 'آب انار', 'چای سبز', 'قهوه اسپرسو'
      ],
      'غذای جانبی': [
        'سالاد فصل', 'ترشی مخلوط', 'مخلفات', 'نان سنگک',
        'ماست', 'سبزی خورشتی', 'پیاز داغ', 'سیر ترشی'
      ]
    };

    for (const category of this.createdData.categories) {
      const foods = foodsByCategory[category.name] || [];
      
      for (const foodName of foods) {
        const foodItem = await FoodItem.create({
          name: foodName,
          description: `${foodName} تازه و خوشمزه`,
          category_id: category.id,
          price: faker.number.float({ min: 50000, max: 300000, precision: 1000 }),
          ingredients: faker.lorem.words(5),
          allergens: faker.helpers.maybe(() => faker.helpers.arrayElement(['گلوتن', 'لبنیات', 'آجیل']), 0.3),
          calories: faker.number.int({ min: 200, max: 800 }),
          preparation_time: faker.number.int({ min: 15, max: 60 }),
          is_vegetarian: faker.datatype.boolean(0.3),
          is_vegan: faker.datatype.boolean(0.1),
          is_gluten_free: faker.datatype.boolean(0.2),
          is_available: true,
          status: 'active',
          created_by: cateringManager.id
        });
        this.createdData.foodItems.push(foodItem);
      }
    }

    logger.info(`✅ ${this.createdData.foodItems.length} غذا ایجاد شد`);
  }

  /**
   * ایجاد منوهای روزانه
   */
  async createDailyMenus() {
    logger.info('📅 ایجاد منوهای روزانه...');

    const cateringManager = this.createdData.users.find(u => u.user_type === 'catering_manager');
    
    // ایجاد منو برای 30 روز آینده
    for (let i = 0; i < 30; i++) {
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + i);
      
      const dailyMenu = await DailyMenu.create({
        menu_date: menuDate.toISOString().split('T')[0],
        title: `منوی ${menuDate.toLocaleDateString('fa-IR')}`,
        description: `منوی متنوع و خوشمزه برای ${menuDate.toLocaleDateString('fa-IR')}`,
        status: i < 7 ? 'published' : 'draft',
        created_by: cateringManager.id,
        published_by: i < 7 ? cateringManager.id : null,
        published_at: i < 7 ? new Date() : null
      });
      this.createdData.dailyMenus.push(dailyMenu);
    }

    logger.info(`✅ ${this.createdData.dailyMenus.length} منوی روزانه ایجاد شد`);
  }

  /**
   * ایجاد آیتم‌های منو
   */
  async createMenuItems() {
    logger.info('🍽️ ایجاد آیتم‌های منو...');

    for (const dailyMenu of this.createdData.dailyMenus) {
      // انتخاب تصادفی غذاها برای هر منو
      const selectedFoods = faker.helpers.arrayElements(
        this.createdData.foodItems, 
        faker.number.int({ min: 5, max: 12 })
      );

      for (let i = 0; i < selectedFoods.length; i++) {
        const foodItem = selectedFoods[i];
        const menuItem = await MenuItem.create({
          daily_menu_id: dailyMenu.id,
          food_item_id: foodItem.id,
          price: foodItem.price,
          quantity_available: faker.number.int({ min: 10, max: 50 }),
          is_available: true,
          sort_order: i + 1,
          special_notes: faker.helpers.maybe(() => faker.lorem.sentence(), 0.2)
        });
        this.createdData.menuItems.push(menuItem);
      }
    }

    logger.info(`✅ ${this.createdData.menuItems.length} آیتم منو ایجاد شد`);
  }

  /**
   * نمایش خلاصه داده‌های ایجاد شده
   */
  logSummary() {
    logger.info('📊 خلاصه داده‌های ایجاد شده:', {
      users: this.createdData.users.length,
      companies: this.createdData.companies.length,
      employees: this.createdData.employees.length,
      food_categories: this.createdData.categories.length,
      food_items: this.createdData.foodItems.length,
      daily_menus: this.createdData.dailyMenus.length,
      menu_items: this.createdData.menuItems.length
    });
  }

  /**
   * پاک کردن تمام داده‌ها
   */
  async clearAll() {
    logger.info('🗑️ پاک کردن تمام داده‌ها...');

    const models = [
      'MenuItem', 'DailyMenu', 'FoodItem', 'FoodCategory',
      'Employee', 'Company', 'User'
    ];

    for (const modelName of models) {
      await sequelize.models[modelName].destroy({ where: {}, force: true });
      logger.info(`✅ داده‌های ${modelName} پاک شد`);
    }
  }
}

export default DatabaseSeeder;