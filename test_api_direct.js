// Direct API test - get a token and call the endpoint
const http = require('http');

// First, login to get a token
const loginData = JSON.stringify({
    email: 'manufacturer@test.com',
    password: 'password123'
});

const loginOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
    }
};

console.log('Step 1: Logging in...');
const loginReq = http.request(loginOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (res.statusCode === 200) {
            const { token } = JSON.parse(data);
            console.log('✓ Login successful, got token');

            // Now call /api/sheets with the token
            console.log('\nStep 2: Calling /api/sheets...');
            const sheetsOptions = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/sheets',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            const sheetsReq = http.request(sheetsOptions, (sheetsRes) => {
                let sheetsData = '';
                sheetsRes.on('data', (chunk) => { sheetsData += chunk; });
                sheetsRes.on('end', () => {
                    console.log(`Status: ${sheetsRes.statusCode}`);
                    if (sheetsRes.statusCode === 200) {
                        const sheets = JSON.parse(sheetsData);
                        console.log(`\n✓ Got ${sheets.length} sheets`);
                        if (sheets.length > 0) {
                            console.log('\nFirst 3 sheets:');
                            sheets.slice(0, 3).forEach(s => {
                                console.log(`  ${s.width}x${s.height} (${s.materialType}): currentStock=${s.currentStock}, minStock=${s.minStock}`);
                            });
                        }
                    } else {
                        console.log('✗ Error:', sheetsData);
                    }
                    process.exit(0);
                });
            });

            sheetsReq.on('error', (e) => {
                console.error('✗ Request failed:', e.message);
                process.exit(1);
            });

            sheetsReq.end();
        } else {
            console.log('✗ Login failed:', data);
            process.exit(1);
        }
    });
});

loginReq.on('error', (e) => {
    console.error('✗ Login request failed:', e.message);
    console.error('Is the server running on port 5000?');
    process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
