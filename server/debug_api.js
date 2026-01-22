const api = require('axios');

async function test() {
    try {
        // 1. Test Login (to get token if needed, but workers use x-worker-id)
        // Admin Login
        // const login = await api.post('http://localhost:5000/api/users/login', { ... });
        // Assuming no auth for stats/tasks for now or using hardcoded header

        console.log('--- Testing /stats ---');
        // Need token for stats
        // Skipping local test because I don't have a valid Admin Token easily without login flow.

        console.log('--- Testing /tasks (Worker ID: 1) ---');
        const res = await api.get('http://localhost:5000/api/workers/tasks', {
            headers: { 'x-worker-id': '1' }
        });
        console.log('Status:', res.status);
        console.log('Data Length:', res.data.length);
        if (res.data.length > 0) {
            console.log('Sample:', JSON.stringify(res.data[0], null, 2));
        }
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error('Response:', e.response.data);
    }
}
test();
