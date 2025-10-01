const pdf = require('pdfkit');
const fs = require('fs');

function generateInvoice(invoiceData) {
    const doc = new pdf();
    const invoicePath = `invoices/invoice_${invoiceData.id}.pdf`;

    doc.pipe(fs.createWriteStream(invoicePath));

    doc.fontSize(25).text('فاکتور', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`شماره فاکتور: ${invoiceData.id}`);
    doc.text(`تاریخ: ${invoiceData.date}`);
    doc.moveDown();

    doc.text('جزئیات:', { underline: true });
    invoiceData.items.forEach(item => {
        doc.text(`${item.name} - ${item.quantity} x ${item.price} تومان`);
    });

    doc.moveDown();
    doc.text(`جمع کل: ${invoiceData.total} تومان`, { bold: true });

    doc.end();

    return invoicePath;
}

module.exports = {
    generateInvoice,
};