/**
 * Creates a blank Excel template for historical data import.
 * Run: node server/create_import_template.js
 * Opens: import_template.xlsx in the project root
 */
const XLSX = require('xlsx');
const path = require('path');

const headers = [
    'date (DD/MM/YYYY)',
    'dealer_name (shopName)',
    'design_number (e.g. P-001)',
    'color_name',
    'width (inches)',
    'height (inches)',
    'quantity',
    'status (DISPATCHED/RECEIVED/etc)',
    'remarks (optional)'
];

const example = [
    '01/07/2024', 'Raj Traders', 'P-001', 'Brown', 30, 78, 5, 'DISPATCHED', ''
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([headers, example]);

// Column widths
ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 20) }));

XLSX.utils.book_append_sheet(wb, ws, 'Orders');

const outPath = path.join(__dirname, '..', 'import_template.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`✅  Template created: ${outPath}`);
console.log('\nFill in your data starting from row 2.');
console.log('dealer_name must exactly match the shopName (or name) in your system.');
console.log('design_number must exactly match the Design Number in your catalogue.');
console.log('color_name must exactly match the Color name in your catalogue.');
