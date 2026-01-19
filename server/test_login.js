
async function testLogin() {
    try {
        console.log('Attempting login to http://localhost:5000/api/auth/login...');
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('LOGIN SUCCESS!');
            console.log('Token:', data.token ? 'Received' : 'Missing');
            console.log('User:', data.user);
        } else {
            console.error('LOGIN FAILED');
            console.error('Status:', response.status);
            const text = await response.text();
            console.error('Response:', text);
        }
    } catch (error) {
        console.error('NETWORK/SCRIPT ERROR:', error.message);
    }
}

testLogin();
