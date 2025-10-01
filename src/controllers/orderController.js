const Order = require('../models/Order');
const Invoice = require('../models/Invoice');

// ایجاد سفارش جدید
exports.createOrder = async (req, res) => {
    // ثبت سفارش جدید
    res.status(201).json({ message: 'سفارش ثبت شد!', order: req.body });
};

// دریافت لیست سفارشات
exports.getAllOrders = async (req, res) => {
    // دریافت لیست سفارشات (نمونه)
    res.status(200).json({ orders: [
        { id: 1, userId: '123', foodItems: [{ foodId: 'a', quantity: 2 }] },
        { id: 2, userId: '456', foodItems: [{ foodId: 'b', quantity: 1 }] }
    ] });
};

// دریافت جزئیات یک سفارش
exports.getOrderById = async (req, res) => {
    // دریافت جزئیات یک سفارش خاص (نمونه)
    const { id } = req.params;
    res.status(200).json({ order: { id, userId: '123', foodItems: [{ foodId: 'a', quantity: 2 }] } });
};

// به‌روزرسانی یک سفارش
exports.updateOrder = async (req, res) => {
    // به‌روزرسانی سفارش (نمونه)
    const { id } = req.params;
    res.status(200).json({ message: `سفارش ${id} به‌روزرسانی شد!`, updatedOrder: req.body });
};

// حذف یک سفارش
exports.deleteOrder = async (req, res) => {
    // حذف سفارش (نمونه)
    const { id } = req.params;
    res.status(200).json({ message: `سفارش ${id} حذف شد!` });
};

// تولید فاکتور برای یک سفارش
exports.generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'سفارش پیدا نشد' });
        }
        const invoiceData = {
            orderId: order._id,
            userId: order.userId,
            totalAmount: order.totalAmount,
            items: order.items,
        };
        const newInvoice = new Invoice(invoiceData);
        await newInvoice.save();
        res.status(201).json({ message: 'فاکتور با موفقیت ایجاد شد', invoice: newInvoice });
    } catch (error) {
        res.status(500).json({ message: 'خطا در ایجاد فاکتور', error });
    }
};