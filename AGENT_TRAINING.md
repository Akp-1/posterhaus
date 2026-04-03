# 🖼️ PosterHaus: Agent & Cashier Training Manual

Welcome to the **PosterHaus** team! This guide explains your role and how to use the system to manage sales at our Doonix Stall.

---

## 🔐 1. Accessing the System
To access the dashboard, open the browser on your device and go to:
**`http://[STALL-IP]:3000/admin.html`**

**Your Login Credentials:**
*   **Agent 1:** `agent1` / `145236`
*   **Agent 2:** `agent2` / `478569`
*   **Agent 3:** `agent3` / `178239`

---

## 🛒 2. Handling Online Orders (UPI)
When a customer buys a poster through the website:
1.  **Notification:** Refresh the "Orders Dashboard" tab frequently. New orders appear as **PENDING** (Yellow).
2.  **Verification:** Ask the customer to show their **Order ID** and the **UTR/Transaction ID** from their UPI app.
3.  **Cross-Check:** Verify the UTR number in your UPI business app (YBL) to ensure the money (₹60, ₹80, or framed price) has arrived.
4.  **Action:** 
    *   If payment is correct: Click **✓ Confirm**.
    *   If payment is missing: Click **✕ Reject**.
5.  **Delivery:** Hand over the poster once you click Confirm.

---

## 🤝 3. Handling In-Person Stall Sales (Cash)
If a customer walks up and buys a poster with cash at the stall:
1.  **Switch Tab:** Go to the **"Manage Inventory"** tab.
2.  **Identify:** Find the poster they just bought in the grid.
3.  **Remove from Site:** Click **"✓ Mark Sold In-Person"**.
4.  **Why?** This is CRITICAL. If you don't do this, someone online might pay for a poster you just handed to a physical customer.

---

## 📸 4. Custom Print Orders
If an order contains a "Custom Print":
1.  **Verification:** These are priced at **₹80** (plus optional framing).
2.  **Process:** Confirm the payment as usual.
3.  **Inform User:** Tell the customer: *"Your custom poster will be ready for pickup **tomorrow at 1:30 PM** right here at the Doonix Sit."*
4.  **Admin Task:** The Master Admin will handle the printing of these files found in the `P_wanted` folder.

---

## 📏 5. Framing Options
*   Customers can choose to add a **Wood Frame** for an extra **₹250**.
*   Check the "Items" column in your dashboard. If it says **[Framed]** in green, ensure you provide the framed version of the poster.

---

## 🚩 6. Important Rules
*   **Never Confirm without Payment:** Always check the UTR number first.
*   **Instant Removal:** Mark in-person sales **immediately**. Do not wait.
*   **Audit Trail:** Every action you take (Confirm/Reject/Sold) is logged with your username. Work responsibly!
*   **Customer Service:** If a poster is "RESERVED" on the site, it means someone else is currently trying to pay for it. Tell the customer to wait 5 minutes to see if it becomes available again.

---
**Stall Location:** Doonix Sit (Near Parking Lot)
**Pickup Time (Customs):** Next Working Day @ 1:30 PM
