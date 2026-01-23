import fs from 'fs';

const content = fs.readFileSync('d:/Z-ON DOOR 2024/zon app/client/src/pages/admin/Dashboard.jsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
    }
}

console.log(`Braces Balance: ${braceCount}`);
console.log(`Parens Balance: ${parenCount}`);

if (braceCount !== 0 || parenCount !== 0) {
    console.log('SYNTAX ERROR DETECTED: Unbalanced braces or parentheses.');
} else {
    console.log('Braces and Parentheses seem balanced.');
}
