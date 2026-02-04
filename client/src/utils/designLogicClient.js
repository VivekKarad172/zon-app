/**
 * Logic to determine Design Type based on Design Number/Name.
 * Replicated from server/utils/designLogic.js for client-side use.
 */

export const getDesignType = (designNumber) => {
    if (!designNumber) return 'UNKNOWN';

    const cleanNum = String(designNumber).toUpperCase().trim();

    // 1. EMBOSS Series
    if (cleanNum.startsWith('ZN-') ||
        cleanNum.startsWith('WD-') ||
        cleanNum.startsWith('WDK-') ||
        cleanNum === '66') {
        return 'EMBOSS';
    }

    // 2. WPC CNC Series
    if (cleanNum.startsWith('WPC-')) {
        return 'WPC CNC';
    }

    // 3. CNC Series
    if (cleanNum.startsWith('PVC-') || cleanNum === 'CNC GROVE') {
        return 'CNC';
    }

    // 4. WPC Series
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

    return 'OTHER';
};

// Master Blank Sizes (Fallback Defaults)
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
 * @param {Array} availableSheets (Optional) List of {width, height} or {w, h} objects from DB
 */
export const getOptimalBlankSize = (width, height, designType, availableSheets = []) => {
    if (!width || !height) return "Missing Dimensions";

    // 1. Parse Dimensions (Handle 'Decimal Eighths' logic from Excel)
    const parseDim = (val) => {
        const intPart = Math.floor(val);
        const decPart = val % 1;
        const eighths = Math.round(decPart * 10);
        return intPart + (eighths / 8);
    };

    const wIn = parseDim(width);
    const hIn = parseDim(height);

    // 2. Determine Extra Margin
    const dType = String(designType || '').toUpperCase();
    let extra = 0;
    if (dType === 'EMBOSS' || dType === 'CNC' || dType === 'WPC CNC') {
        extra = 1.2;
    } else if (dType === 'PLAIN') {
        extra = 1.0;
    } else if (dType === 'WPC PLAIN') {
        extra = 0; // WPC doesn't need margin - use exact door size
    } else {
        extra = 0;
    }

    const reqW = wIn + extra;
    const reqH = hIn + extra;

    // 3. Prepare Candidates
    let pool = DEFAULT_BLANK_SIZES;
    if (availableSheets && availableSheets.length > 0) {
        // Map DB format (width, height) to internal format (w, h) if needed
        pool = availableSheets.map(s => ({
            w: s.w || s.width,
            h: s.h || s.height
        }));
    }

    // 4. Find Best Fit
    const candidates = pool.filter(b => b.w >= reqW && b.h >= reqH);

    if (candidates.length === 0) return "No match";

    // Sort by "Distance"
    candidates.sort((a, b) => {
        const distA = Math.pow(a.w - reqW, 2) + Math.pow(a.h - reqH, 2);
        const distB = Math.pow(b.w - reqW, 2) + Math.pow(b.h - reqH, 2);
        return distA - distB;
    });

    const best = candidates[0];
    return `${best.w} x ${best.h}`;
};
