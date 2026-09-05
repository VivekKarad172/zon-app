async function verifyOptionB() {
    const BASE_URL = 'http://localhost:5000/api'; // Revert to Port 5000

    try {
        console.log('--- VERIFYING OPTION B (Stock Lifecycle) ---');

        // 1. Login as Admin (Manufacturer)
        const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const adminToken = (await adminLogin.json()).token;
        const adminHeaders = {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        };

        // 1b. Login as Dealer (deal1) - Use Dealer Login Endpoint
        const dealerLogin = await fetch(`${BASE_URL}/auth/dealer-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'dealer@test.com' })
        });
        const dealerData = await dealerLogin.json();
        if (!dealerLogin.ok) throw new Error(`Dealer Login Failed: ${JSON.stringify(dealerData)}`);
        const dealerToken = dealerData.token;
        const dealerHeaders = {
            'Authorization': `Bearer ${dealerToken}`,
            'Content-Type': 'application/json'
        };

        // Helper to get sheet data (Admin Only)
        async function getSheetData() {
            const res = await fetch(`${BASE_URL}/sheets`, { headers: adminHeaders });
            const sheets = await res.json();
            return sheets.find(s => s.width === 29 && s.height === 75 && s.materialType === 'PVC');
        }

        // 2. Initial State
        const initialSheet = await getSheetData();
        console.log('\n[INITIAL STATE]');
        console.log(`Current: ${initialSheet.currentStock}`);
        console.log(`Blocked: ${initialSheet.blockedSheets}`);
        console.log(`Available: ${initialSheet.availableStock}`);

        // 3. Create Order (AS DEALER)
        console.log('\n[ACTION] Creating Order for 1 Item (Qty 1 = 2 Sheets) as DEALER...');
        const orderRes = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: dealerHeaders,
            body: JSON.stringify({
                items: [{
                    designId: 1,
                    colorId: 1,
                    width: 27,
                    height: 73,
                    quantity: 1,
                    remarks: 'Test Option B'
                }]
            })
        });
        const order = await orderRes.json();
        if (!orderRes.ok) throw new Error(`Order Create Failed: ${JSON.stringify(order)}`);
        console.log(`Order #${order.id} Created.`);

        // 4. Check State after Creation (PENDING) - Admin checks
        const pendingSheet = await getSheetData();
        console.log('\n[STATE: PENDING]');
        console.log(`Current: ${pendingSheet.currentStock} (Should be SAME as Initial)`);
        console.log(`Blocked: ${pendingSheet.blockedSheets} (Should be Initial + 2)`);
        console.log(`Available: ${pendingSheet.availableStock} (Should be Initial - 2)`);

        if (pendingSheet.currentStock !== initialSheet.currentStock) console.error('❌ FAIL: Current Stock changed on Create!');
        else console.log('✅ PASS: Current Stock preserved.');

        if (pendingSheet.availableStock !== initialSheet.availableStock - 2) console.error('❌ FAIL: Available Stock did not decrease!');
        else console.log('✅ PASS: Available Stock decreased.');

        // User Request: Orders Received column should show SHEETS (2), not Orders (1)
        // Note: quantity=1 means 2 sheets.
        if (pendingSheet.ordersReceived !== initialSheet.ordersReceived + 2) console.error(`❌ FAIL: Orders Received (Sheet Count) ${pendingSheet.ordersReceived} !== ${initialSheet.ordersReceived + 2}`);
        else console.log(`✅ PASS: Orders Received column shows ${pendingSheet.ordersReceived} sheets (Correct).`);

        // 5. Update Status to PRODUCTION (AS ADMIN)
        console.log('\n[ACTION] Moving Order to PRODUCTION as ADMIN...');
        const updateRes = await fetch(`${BASE_URL}/orders/${order.id}/status`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify({ status: 'PRODUCTION' })
        });
        const updateData = await updateRes.json();
        if (!updateRes.ok) throw new Error(`Update Failed: ${JSON.stringify(updateData)}`);

        // 6. Check State after Production
        const prodSheet = await getSheetData();
        console.log('\n[STATE: PRODUCTION]');
        console.log(`Current: ${prodSheet.currentStock} (Should be Initial - 2)`);
        console.log(`Blocked: ${prodSheet.blockedSheets} (Should be Initial Blocked)`);
        console.log(`Available: ${prodSheet.availableStock} (Should match PENDING Available)`);

        if (prodSheet.currentStock !== initialSheet.currentStock - 2) console.error('❌ FAIL: Current Stock not deducted!');
        else console.log('✅ PASS: Current Stock deducted.');

        // Blocked should go back to Initial, because this order is no longer "Blocked" (it's consumed)
        // AND previous orders (Initial Blocked) are still Blocked.
        if (prodSheet.blockedSheets !== initialSheet.blockedSheets) console.error(`❌ FAIL: Blocked sheets mismatch! Expected ${initialSheet.blockedSheets}, got ${prodSheet.blockedSheets}`);
        else console.log('✅ PASS: Blocked sheets released.');

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    }
}

verifyOptionB();
