const { getOptimalBlankSize } = require('./server/utils/designLogic');

// Test Cases derived from User Logic
const testCases = [
    // Case 1: Emboss (Margin +1.2), Raw 29.4 -> 29 + 4/8 = 29.5
    // Req: 29.5 + 1.2 = 30.7. Should pick 32x75? (If H fits)
    // Let's assume Height 78.4 -> 78 + 4/8 = 78.5 + 1.2 = 79.7
    // Blank should be >= 30.7 W and >= 79.7 H.
    // Candidates: 32x82, 36x82...
    { w: 29.4, h: 78.4, type: 'EMBOSS', expected: '32 x 82' }, // approx

    // Case 2: Standard Inches (No eighths logic if pure int? No, logic always applies)
    // If input is 32.0, parse is 32.0.
    // Type PLAIN (Margin +1.0). Req: 33.0 x 81.0 (if H=80)
    // Blank >= 33 x 81.
    // Candidates: 36x82
    { w: 32.0, h: 80.0, type: 'PLAIN', expected: '36 x 82' },

    // Case 3: Smaller door
    { w: 26.0, h: 72.0, type: 'PLAIN', expected: '29 x 75' },

    // Case 4: No Match
    { w: 40.0, h: 90.0, type: 'EMBOSS', expected: 'No match' }
];

console.log("Running Tests for getOptimalBlankSize...\n");

testCases.forEach((t, i) => {
    const result = getOptimalBlankSize(t.w, t.h, t.type);
    console.log(`Test #${i + 1}: Input [${t.w} x ${t.h}, ${t.type}] -> Result: ${result}`);
    if (t.expected && result !== t.expected) {
        console.warn(`   WARNING: Expected ${t.expected}, got ${result}`);
    } else {
        console.log(`   PASS`);
    }
});
