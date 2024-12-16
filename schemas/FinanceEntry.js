const mongoose = require('mongoose');

const financeEntrySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FinanceEntry', financeEntrySchema);
