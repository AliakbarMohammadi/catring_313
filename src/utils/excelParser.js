const XLSX = require('xlsx');

function parseExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const data = [];

    sheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        data.push(...jsonData);
    });

    return data;
}

module.exports = {
    parseExcelFile
};