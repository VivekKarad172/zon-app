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


// Master Blank Sizes (Width x Height) from User Screenshot
// Master Blank Sizes (Width x Height) - Fallback Defaults
const DEFAULT_BLANK_SIZES = [
    { w: 29, h: 75 },
    { w: 32, h: 75 },
    { w: 36, h: 75 },
    { w: 29, h: 78 },
    { w: 32, h: 78 },
    { w: 36, h: 78 },
    { w: 29, h: 82 },
    { w: 32, h: 82 },
    { w: 36, h: 82 },
    { w: 29, h: 85 },
    { w: 32, h: 85 },
    { w: 36, h: 85 },
    { w: 29, h: 90 },
    { w: 32, h: 90 },
    { w: 36, h: 90 },
    { w: 32, h: 95 }
];

/**
 * Calculate Optimal Blank Size
 * Formula:
 * 1. Convert Input W/H (if in Decimal Eighths format e.g. 29.4 -> 29 4/8")
 * 2. Add Margin based on Design Type
 * 3. Find smallest available blank that fits
 * 
 * @param {number} width 
 * @param {number} height 
 * @param {string} designType 
 * @param {Array} availableSheets (Optional) List of {width, height} from DB
 */
const getOptimalBlankSize = (width, height, designType, availableSheets = []) => {
    if (!width || !height) return "Missing Dimensions";

    // 1. Parse Dimensions (Handle 'Decimal Eighths' logic from Excel)
    // Excel: INT($I2)+(ROUND(MOD($I2,1)*10,0)/8)
    // If width is 29.4, it means 29 + 4/8 inches.
    const parseDim = (val) => {
        const intPart = Math.floor(val);
        const decPart = val % 1;
        // Check if it looks like the decimal eighth format (e.g. .1 to .9)
        // If it's a standard float (e.g. 29.5 meaning half), this logic treats it as 5/8.
        // We assume User Input follows the specific Excel convention.
        const eighths = Math.round(decPart * 10);
        return intPart + (eighths / 8);
    };

    const wIn = parseDim(width);
    const hIn = parseDim(height);

    // 2. Determine Extra Margin
    // Excel: IF(EMBOSS, 1.2, IF(CNC, 1.2, IF(PLAIN, 1, 0)))
    const dType = String(designType || '').toUpperCase();
    let extra = 0;
    if (dType === 'EMBOSS' || dType === 'CNC' || dType === 'WPC CNC') {
        extra = 1.2;
    } else if (dType === 'PLAIN') {
        extra = 1.0;
    } else if (dType === 'WPC PLAIN') {
        extra = 0; // WPC doesn't need margin - use exact door size
    } else {
        // Fallback for others (Unknown/Digital/etc) - Default to 0 or safe margin?
        // Excel formula defaults to 0 if not matched.
        extra = 0;
    }

    const reqW = wIn + extra;
    const reqH = hIn + extra;

    // 3. Prepare Candidates
    let pool = DEFAULT_BLANK_SIZES;
    if (availableSheets && availableSheets.length > 0) {
        // Map DB format (width, height) to internal format (w, h)
        pool = availableSheets.map(s => ({
            w: s.width || s.w, // Handle DB object or plain object
            h: s.height || s.h
        }));
    }

    // 4. Find Best Fit
    // Filter pairs where Blank >= Req
    const candidates = pool.filter(b => b.w >= reqW && b.h >= reqH);

    if (candidates.length === 0) return "No match";

    // Sort by "Distance" (Minimize wastage/fit)
    // Excel: (BlankW - reqW)^2 + (BlankH - reqH)^2
    // We want the one with MINIMUM distance value.
    candidates.sort((a, b) => {
        const distA = Math.pow(a.w - reqW, 2) + Math.pow(a.h - reqH, 2);
        const distB = Math.pow(b.w - reqW, 2) + Math.pow(b.h - reqH, 2);
        return distA - distB;
    });

    const best = candidates[0];
    return `${best.w} x ${best.h}`;
};

module.exports = { getOptimalBlankSize, getDesignType };
