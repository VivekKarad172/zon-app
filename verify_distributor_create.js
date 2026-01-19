const axios = require('axios');

async function run() {
    try {
        console.log('1. Authenticating as Admin...');
        // Using seeded admin credentials
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('   Success! Token received.');

        console.log('2. Creating Distributor "Shubham Enterprise"...');
        const distributorPayload = {
            name: 'Shubham Enterprise',
            username: 'shubham',
            password: 'shubham123',
            city: 'Surat',
            role: 'DISTRIBUTOR',
            isEnabled: true
        };

        const createRes = await axios.post('http://localhost:5000/api/users', distributorPayload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('   SUCCESS! Distributor created.');
        console.log('   ID:', createRes.data.id);
        console.log('   Response:', createRes.data);

    } catch (error) {
        console.error('   FAILED!');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        } else {
            console.error('   Error:', error.message);
        }
    }
}

run();
