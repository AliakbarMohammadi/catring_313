const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: String,
    employees: [{ name: String, nationalId: String }]
});

module.exports = mongoose.model('Company', companySchema);