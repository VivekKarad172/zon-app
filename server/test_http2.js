// Test with better error handling
(async () => {
    try {
        const loginRes = await fetch('http://localhost:5000/api/workers/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'sandeepbhai@zon.com', password: 'password' })
        });

        const loginData = await loginRes.json();
        const token = loginData.token;

        const sheetsRes = await fetch('http://localhost:5000/api/sheets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const responseText = await sheetsRes.text();
        console.log('\n📄 Raw Response:');
        console.log(responseText);

        const sheets = JSON.parse(responseText);
        console.log('\n✅ Parsed:', typeof sheets, Array.isArray(sheets));
        console.log('Length:', sheets.length);
        if (sheets.length > 0) {
            console.log('First sheet:', sheets[0]);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
})();
