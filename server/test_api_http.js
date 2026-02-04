const axios = require('axios');

async function testAPI() {
    console.log('🌐 Testing /api/sheets endpoint...\n');

    // Get a valid token first
    try {
        // Login as worker
        const loginRes = await axios.post('http://localhost:5000/api/workers/login', {
            email: 'sandeepbhai@zon.com',
            password: 'password'
        });

        const token = loginRes.data.token;
        console.log('✅ Logged in, token:', token.substring(0, 20) + '...');

        // Call sheets API
        const sheetsRes = await axios.get('http://localhost:5000/api/sheets', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('\n✅ Sheets API Response:');
        console.log('Total sheets:', sheetsRes.data.length);
        console.log('First 3 sheets:');
        console.table(sheetsRes.data.slice(0, 3));

        console.log('\nMaterial types:');
        const pvc = sheetsRes.data.filter(s => s.materialType === 'PVC').length;
        const wpc = sheetsRes.data.filter(s => s.materialType === 'WPC').length;
        console.log(`PVC: ${pvc}, WPC: ${wpc}`);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testAPI();
