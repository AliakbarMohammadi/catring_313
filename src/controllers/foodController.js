const Food = require('../models/Food');

exports.getAllFoods = async (req, res) => {
    try {
        const foodItems = await Food.find();
        res.status(200).json(foodItems);
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت غذاها.', error });
    }
};

exports.addFood = async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const newFoodItem = new Food({ name, description, price });
        await newFoodItem.save();
        res.status(201).json({ message: 'غذای جدید با موفقیت اضافه شد.', foodItem: newFoodItem });
    } catch (error) {
        res.status(500).json({ message: 'خطا در اضافه کردن غذا.', error });
    }
};

exports.updateFood = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price } = req.body;
        const updatedFoodItem = await Food.findByIdAndUpdate(id, { name, description, price }, { new: true });
        if (!updatedFoodItem) {
            return res.status(404).json({ message: 'غذا پیدا نشد.' });
        }
        res.status(200).json({ message: 'غذا با موفقیت به‌روزرسانی شد.', foodItem: updatedFoodItem });
    } catch (error) {
        res.status(500).json({ message: 'خطا در به‌روزرسانی غذا.', error });
    }
};

exports.deleteFood = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedFoodItem = await Food.findByIdAndDelete(id);
        if (!deletedFoodItem) {
            return res.status(404).json({ message: 'غذا پیدا نشد.' });
        }
        res.status(200).json({ message: 'غذا با موفقیت حذف شد.' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در حذف غذا.', error });
    }
};

exports.getFoodById = async (req, res) => {
    try {
        const { id } = req.params;
        const foodItem = await Food.findById(id);
        if (!foodItem) {
            return res.status(404).json({ message: 'غذا پیدا نشد.' });
        }
        res.status(200).json(foodItem);
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت غذا.', error });
    }
};