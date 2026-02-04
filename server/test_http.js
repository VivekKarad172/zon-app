// Simple test using fetch
(async () => {
    console.log('🌐 Testing /api/sheets endpoint...\n');

    try {
        // Login
        const loginRes = await fetch('http://localhost:5000/api/workers/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'sandeepbhai@zon.com',
                password: 'password'
            })
        });

        const { token } = await loginRes.json();
        console.log('✅ Logged in');

        // Get sheets
        const sheetsRes = await fetch('http://localhost:5000/api/sheets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const sheets = await sheetsRes.json();
        console.log('\n✅ API Response:');
        console.log('Total sheets:', sheets.length);
        console.log('Sample:', sheets.slice(0, 3));
        console.log('\nMaterial breakdown:');
        console.log('PVC:', sheets.filter(s => s.materialType === 'PVC').length);
        console.log('WPC:', sheets.filter(s => s.materialType === 'WPC').length);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
})();
