/**
 * Logic to determine Design Type based on Design Number/Name.
 * Derived from User's Legacy App Script / Spreadsheet logic.
 */

const getDesignType = (designNumber) => {
    if (!designNumber) return 'UNKNOWN';

    const cleanNum = String(designNumber).toUpperCase().trim();

    // 1. EMBOSS Series
    if (cleanNum.startsWith('ZN-') ||
        cleanNum.startsWith('WD-') ||
        cleanNum.startsWith('WDK-') ||
        cleanNum === '66') {
        return 'EMBOSS';
    }

    // 2. WPC CNC Series (WPC-1xx, WPC-2xx)
    // Note: Must come before generic WPC check if overlaps exist, 
    // but lookup says WPC-101 is WPC CNC.
    if (cleanNum.startsWith('WPC-')) {
        return 'WPC CNC';
    }

    // 3. CNC Series (PVC-xxx)
    if (cleanNum.startsWith('PVC-') || cleanNum === 'CNC GROVE') {
        return 'CNC';
    }

    // 4. WPC Series (Specifics)
    if (cleanNum.includes('28MM WPC')) {
        return 'WPC';
    }

    // 5. PLAIN Series
    if (cleanNum === 'PLAIN') {
        return 'PLAIN';
    }
    if (cleanNum === 'WPC FOIL') {
        return 'WPC PLAIN';
    }

    // 6. DIGITAL Series
    if (cleanNum.includes('HOLO') || cleanNum.includes('DIGITAL')) {
        return 'DIGITAL';
    }

    // Default Fallback
    return 'OTHER';
};

module.exports = { getDesignType };
