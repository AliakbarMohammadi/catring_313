// src/controllers/foodController.js
const Food = require('../models/Food');

// @desc    Add a new food
// @route   POST /api/foods
// @access  Private/Admin
const addFood = async (req, res) => {
  const { name, price, description, category } = req.body;

  try {
    const food = new Food({
      name,
      price,
      description,
      category,
    });

    const createdFood = await food.save();
    res.status(201).json(createdFood);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update a food
// @route   PUT /api/foods/:id
// @access  Private/Admin
const updateFood = async (req, res) => {
  const { name, price, description, category, isAvailable } = req.body;

  try {
    const food = await Food.findById(req.params.id);

    if (food) {
      food.name = name || food.name;
      food.price = price || food.price;
      food.description = description || food.description;
      food.category = category || food.category;
      food.isAvailable = isAvailable !== undefined ? isAvailable : food.isAvailable;

      const updatedFood = await food.save();
      res.json(updatedFood);
    } else {
      res.status(404).json({ message: 'Food not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a food
// @route   DELETE /api/foods/:id
// @access  Private/Admin
const deleteFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (food) {
      await food.deleteOne(); // یا Food.findByIdAndDelete(req.params.id)
      res.json({ message: 'Food removed' });
    } else {
      res.status(404).json({ message: 'Food not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all foods
// @route   GET /api/foods
// @access  Private (همه کاربران لاگین کرده می‌توانند ببینند)
const getAllFoods = async (req, res) => {
  try {
    const foods = await Food.find({});
    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { addFood, updateFood, deleteFood, getAllFoods };