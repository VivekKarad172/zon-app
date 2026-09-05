/**
 * WhatsApp Notification Service (Twilio)
 *
 * Setup:
 * 1. Sign up at https://www.twilio.com
 * 2. Enable WhatsApp Sandbox (free) or buy a WhatsApp Business number
 * 3. Add these to your server/.env file:
 *      TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *      TWILIO_AUTH_TOKEN=your_auth_token
 *      TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (sandbox number or your number)
 *      MANUFACTURER_PHONE=+919876543210             (your WhatsApp number, with country code)
 *
 * All functions silently degrade (only log) if Twilio is not configured.
 */

let twilioClient = null;

function getClient() {
    if (twilioClient) return twilioClient;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token || sid.startsWith('AC_PLACEHOLDER')) return null;
    try {
        twilioClient = require('twilio')(sid, token);
        return twilioClient;
    } catch (e) {
        console.warn('[WhatsApp] Twilio not installed. Run: npm install twilio');
        return null;
    }
}

async function sendWhatsApp(toPhone, message) {
    if (!toPhone) return;

    const client = getClient();
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!client || !from) {
        // Twilio not configured — log only (does not break the app)
        console.log(`[WhatsApp NOT SENT] To: ${toPhone} | Msg: ${message.slice(0, 80)}...`);
        return;
    }

    // Normalize phone number to WhatsApp format
    const to = toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`;

    try {
        await client.messages.create({ from, to, body: message });
        console.log(`[WhatsApp SENT] To: ${toPhone}`);
    } catch (err) {
        console.error(`[WhatsApp ERROR] To: ${toPhone} | ${err.message}`);
    }
}

// ─── Notification Templates ──────────────────────────────────────────────────

async function notifyDealerOrderReceived(dealer, orderId) {
    if (!dealer?.phone) return;
    await sendWhatsApp(dealer.phone,
        `✅ *Z-ON DOOR*\nHello ${dealer.name || dealer.shopName},\n\nYour Order #${orderId} has been received and is now in queue.\n\nThank you for your order!`
    );
}

async function notifyDealerOrderReady(dealer, orderId) {
    if (!dealer?.phone) return;
    await sendWhatsApp(dealer.phone,
        `📦 *Z-ON DOOR — Order Ready!*\nHello ${dealer.name || dealer.shopName},\n\nYour Order #${orderId} is packed and *ready for pickup/dispatch*.\n\nPlease contact your distributor for delivery details.`
    );
}

async function notifyDealerOrderDispatched(dealer, orderId) {
    if (!dealer?.phone) return;
    await sendWhatsApp(dealer.phone,
        `🚚 *Z-ON DOOR — Order Dispatched!*\nHello ${dealer.name || dealer.shopName},\n\nYour Order #${orderId} has been *dispatched*.\n\nExpect delivery soon. For queries, contact your distributor.`
    );
}

async function notifyManufacturerNewOrder(orderId, dealerName, itemCount) {
    const phone = process.env.MANUFACTURER_PHONE;
    if (!phone) return;
    await sendWhatsApp(phone,
        `🛎️ *New Order — Z-ON DOOR*\nDealer: ${dealerName}\nOrder #${orderId} | ${itemCount} item(s)\n\nLogin to dashboard to review.`
    );
}

async function notifyDistributorOrderReady(distributor, orderId) {
    if (!distributor?.phone) return;
    await sendWhatsApp(distributor.phone,
        `📦 *Z-ON DOOR — Order Ready*\nHello ${distributor.name || distributor.shopName},\n\nOrder #${orderId} from your dealer is packed and *ready for dispatch*.\n\nLogin to mark it dispatched.`
    );
}

module.exports = {
    sendWhatsApp,
    notifyDealerOrderReceived,
    notifyDealerOrderReady,
    notifyDealerOrderDispatched,
    notifyManufacturerNewOrder,
    notifyDistributorOrderReady
};
