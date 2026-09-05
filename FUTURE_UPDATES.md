# Z-ON DOOR — Future Updates Roadmap

A running list of features and improvements to build in future releases.
Add new ideas here as they come up. Mark done ones with ✅.

---

## 🔴 High Priority (Do Soon)

### Excel Export for Accountant
- "Download This Month's Orders" button on Admin Dashboard
- Produces a clean Excel sheet: Order #, Dealer Name, Items, Design, Color, Dimensions, Quantity, Status, Date
- Also useful for distributor to download their own orders
- Library already installed: `xlsx` (XLSX package is in client/package.json)

### Dealer Password — First Login Flow
- Right now admin sets the dealer password manually
- Better: dealer gets an email with a one-time link to set their own password
- Requires email sending setup (Nodemailer or similar)

### Dispatch Confirmation / Delivery Proof
- When admin marks order DISPATCHED, add optional photo upload (e.g., loading photo)
- Dealer can confirm receipt from their dashboard
- Eliminates "I never received it" disputes

---

## 🟡 Medium Priority (Next Phase)

### WhatsApp — Two-Way Updates
- Currently we send alerts TO dealers/distributors
- Future: dealer replies "CONFIRM" on WhatsApp to acknowledge delivery
- Requires Twilio webhook setup

### Manager Role — Full Dashboard
- Manager currently has a basic view
- Build out: manager can approve orders moving to PRODUCTION (so manufacturer doesn't have to)
- Manager can view and print packing slips

### Packing Slip / Delivery Challan PDF
- When order is READY, generate a printable PDF: Order #, items list, dealer info, dimensions
- Worker at packing station prints it and puts it in the box
- Use `pdfkit` or `puppeteer` on backend

### Dealer App — Order History with Filter
- Dealers can currently see orders but filter options are limited
- Add: filter by date range, filter by status, search by design number

### Worker Performance Dashboard
- Already have ProcessRecord data (who did what, when)
- Build a chart: per worker, how many doors completed per day/week
- Useful for productivity tracking and incentive calculation

### HPL Door Category Support
- When HPL doors are added to business, admin needs to:
  1. Add "HPL" as a DoorType in the system
  2. Update designLogic.js to handle HPL margin/blank-size calculation
  3. Worker dashboard may need a separate HPL-specific stage (if process differs)

---

## 🟢 Nice to Have (Future)

### SMS Fallback
- If dealer doesn't have WhatsApp, send SMS instead
- Use same Twilio account (just different API call)

### Google Maps Integration for Delivery Tracking
- Distributor logs delivery location when dispatching
- Manufacturer can see on a map where orders went

### Bulk Order Template Download
- Admin downloads a pre-formatted Excel template
- Fills it in and uploads — bulk creates orders
- Currently bulk import exists but template isn't auto-generated

### Customer-Facing Order Tracking Page
- Public URL: `zon-door.com/track/ORDER123`
- No login needed — just enter order number to see status
- Good for dealer's own customers who want visibility

### Low Stock Auto-Reorder Suggestion
- When sheet stock drops below minimum, suggest a reorder quantity
- Based on average consumption from last 30 days
- Send WhatsApp to manufacturer: "You need to reorder 30 x 78 PVC sheets (used 45 last month)"

### Mobile App (Android) — Push Notifications
- Currently using Capacitor for Android APK
- Add Firebase Cloud Messaging (FCM) for push notifications
- Dealer gets phone notification even when app is closed

---

## ✅ Completed

- JWT auth verify endpoint fix (was returning OK always)
- Worker routes security (tasks/complete/history/undo had no auth)
- Bulk status update now creates ProductionUnits (workers were not seeing tasks)
- Order creation wrapped in database transaction (no more partial orders)
- Stock deduction race condition fixed (atomic decrement)
- Dealer password support added (optional, backward compatible)
- Phone number field added to all users (for WhatsApp)
- WhatsApp notification service built (Twilio, graceful if not configured)
- WhatsApp alerts: new order → manufacturer, order ready → dealer + distributor, dispatched → dealer

---

*Last updated: 2026-06-14*
