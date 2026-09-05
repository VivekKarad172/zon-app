/**
 * Merge Gujarati-named dealers into their English twins.
 * ======================================================
 * Some months had shop names (Column D) written in Gujarati, creating duplicate
 * dealer records. This transliterates each Gujarati name, fuzzy-matches it to an
 * existing ENGLISH dealer UNDER THE SAME DISTRIBUTOR, and merges them
 * (moves orders to the English dealer, then deletes the Gujarati duplicate).
 *
 *   node server/merge_gujarati_dealers.js              → dry-run report (no changes)
 *   node server/merge_gujarati_dealers.js --apply      → apply HIGH-confidence merges
 *   node server/merge_gujarati_dealers.js --apply --all → also apply MEDIUM matches
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Op } = require('sequelize');
const { sequelize, User, Order } = require('./models');

const APPLY = process.argv.includes('--apply');
const INCLUDE_MEDIUM = process.argv.includes('--all');
const GUJ = /[઀-૿]/;

// ─── Gujarati → Latin transliteration ────────────────────────────────────────
const V_IND = { 'અ':'a','આ':'aa','ઇ':'i','ઈ':'i','ઉ':'u','ઊ':'u','ઋ':'ru','એ':'e','ઐ':'ai','ઓ':'o','ઔ':'au' };
const MATRA = { 'ા':'aa','િ':'i','ી':'i','ુ':'u','ૂ':'u','ૃ':'ru','ે':'e','ૈ':'ai','ો':'o','ૌ':'au','્':'' };
const CONS = {
    'ક':'k','ખ':'kh','ગ':'g','ઘ':'gh','ઙ':'ng',
    'ચ':'ch','છ':'chh','જ':'j','ઝ':'jh','ઞ':'ny',
    'ટ':'t','ઠ':'th','ડ':'d','ઢ':'dh','ણ':'n',
    'ત':'t','થ':'th','દ':'d','ધ':'dh','ન':'n',
    'પ':'p','ફ':'f','બ':'b','ભ':'bh','મ':'m',
    'ય':'y','ર':'r','લ':'l','વ':'v','ળ':'l',
    'શ':'sh','ષ':'sh','સ':'s','હ':'h',
};
const SIGN = { 'ં':'n','ઃ':'h','ઁ':'n','ૐ':'om' };

function transliterate(text) {
    let out = '';
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (CONS[c]) {
            out += CONS[c];
            const next = chars[i + 1];
            if (next && MATRA[next] !== undefined) { out += MATRA[next]; i++; }
            else if (next === '્') { i++; }            // virama: no vowel
            else out += 'a';                            // inherent vowel
        } else if (V_IND[c]) out += V_IND[c];
        else if (SIGN[c]) out += SIGN[c];
        else if (c === ' ') out += ' ';
        else out += c; // leave latin/punct as-is
    }
    return out;
}

// ─── phonetic key for fuzzy matching (folds English & translit to same space) ─
function phonKey(s) {
    return String(s).toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .replace(/\bthe\b/g, '')
        .replace(/c/g, 'k')          // corporation → korporation
        .replace(/w/g, 'v')          // wood → vood
        .replace(/ph/g, 'f').replace(/f/g, 'p')  // fiber/phaibar → piber
        .replace(/q/g, 'k').replace(/x/g, 'ks').replace(/z/g, 'j')
        .replace(/\s+/g, '')
        .replace(/(.)\1+/g, '$1')    // collapse doubled letters
        .replace(/[aeiou]/g, '');    // drop vowels → consonant skeleton
}

function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    return d[m][n];
}
const sim = (a, b) => { const M = Math.max(a.length, b.length); return M ? 1 - lev(a, b) / M : 1; };

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
    await sequelize.sync();
    const dealers = await User.findAll({ where: { role: 'DEALER' }, attributes: ['id', 'name', 'distributorId', 'shopName'] });

    const gujDealers = dealers.filter(d => GUJ.test(d.name));
    const engByDist = {};
    for (const d of dealers) {
        if (GUJ.test(d.name)) continue;
        (engByDist[d.distributorId] = engByDist[d.distributorId] || []).push(d);
    }

    const HIGH = 0.82, MED = 0.62;
    const plans = [];

    for (const g of gujDealers) {
        const translit = transliterate(g.name).trim();
        const gKey = phonKey(translit);
        const candidates = engByDist[g.distributorId] || [];
        let best = null, bestScore = -1, second = -1;
        for (const c of candidates) {
            const s = sim(gKey, phonKey(c.name));
            if (s > bestScore) { second = bestScore; bestScore = s; best = c; }
            else if (s > second) second = s;
        }
        const conf = bestScore >= HIGH ? 'HIGH' : bestScore >= MED ? 'MEDIUM' : 'LOW';
        plans.push({ g, translit, best, score: bestScore, margin: bestScore - second, conf });
    }

    plans.sort((a, b) => b.score - a.score);

    console.log(`\n${'═'.repeat(78)}`);
    console.log(`Gujarati dealers: ${gujDealers.length}  |  ${APPLY ? 'APPLY MODE' : 'DRY RUN'}${INCLUDE_MEDIUM ? ' (incl. MEDIUM)' : ''}`);
    console.log(`${'═'.repeat(78)}\n`);

    const toApply = [];
    for (const p of plans) {
        const tag = p.conf === 'HIGH' ? '✅' : p.conf === 'MEDIUM' ? '🟡' : '❌';
        console.log(`${tag} [${p.conf} ${p.score.toFixed(2)}] "${p.g.name}"  (≈ ${p.translit})`);
        console.log(`      → ${p.best ? `"${p.best.name}"` : '(no English dealer under this distributor)'}`);
        const eligible = p.conf === 'HIGH' || (INCLUDE_MEDIUM && p.conf === 'MEDIUM');
        if (eligible && p.best && p.best.id !== p.g.id) toApply.push(p);
    }

    console.log(`\n${'─'.repeat(78)}`);
    console.log(`HIGH: ${plans.filter(p=>p.conf==='HIGH').length}  MEDIUM: ${plans.filter(p=>p.conf==='MEDIUM').length}  LOW (need manual): ${plans.filter(p=>p.conf==='LOW').length}`);
    console.log(`Will merge now: ${toApply.length}`);

    if (!APPLY) {
        console.log('\nDry run — re-run with --apply (HIGH only) or --apply --all (HIGH+MEDIUM).');
        await sequelize.close(); return;
    }

    let merged = 0, movedOrders = 0;
    for (const p of toApply) {
        const t = await sequelize.transaction();
        try {
            // move orders from gujarati dealer → english dealer
            const [cnt] = await Order.update({ userId: p.best.id }, { where: { userId: p.g.id }, transaction: t });
            await User.destroy({ where: { id: p.g.id }, transaction: t });
            await t.commit();
            merged++; movedOrders += cnt;
            console.log(`   ✅ merged "${p.g.name}" → "${p.best.name}" (${cnt} orders moved)`);
        } catch (e) {
            await t.rollback();
            console.error(`   ❌ failed "${p.g.name}": ${e.message}`);
        }
    }
    console.log(`\n🎉 Merged ${merged} dealers, moved ${movedOrders} orders.`);
    const remaining = (await User.findAll({ where: { role: 'DEALER' }, attributes: ['name'] })).filter(d => GUJ.test(d.name)).length;
    console.log(`Remaining Gujarati-named dealers: ${remaining}`);
    await sequelize.close();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
