const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    foodItems: [{ foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' }, quantity: Number }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);