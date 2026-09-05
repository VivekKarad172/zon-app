// Quick test to check API response
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/sheets',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        if (res.statusCode === 200) {
            try {
                const json = JSON.parse(data);
                if (json.length > 0) {
                    console.log('\nFirst sheet:');
                    console.log(JSON.stringify(json[0], null, 2));
                } else {
                    console.log('Empty array returned');
                }
            } catch (e) {
                console.log('Response:', data);
            }
        } else {
            console.log('Error response:', data);
        }
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('Request failed:', error.message);
    process.exit(1);
});

req.end();
