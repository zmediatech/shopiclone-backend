const AbandonedCheckout = require('../models/AbandonedCheckout');
const Store = require('../models/Store');
const { sendEmail } = require('./emailService');

const processAbandonedCheckouts = async () => {
    console.log('🤖 Running Abandoned Checkout Recovery Job...');
    try {
        // Find checkouts older than 1 hour, not yet sent recovery email, and still pending
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const abandonedCheckouts = await AbandonedCheckout.find({
            status: 'pending',
            recoveryEmailSent: false,
            createdAt: { $lt: oneHourAgo }
        });

        console.log(`🔍 Found ${abandonedCheckouts.length} abandoned checkouts to process.`);

        for (const checkout of abandonedCheckouts) {
            const store = await Store.findById(checkout.storeId);
            if (!store || !store.smtpSettings || !store.smtpSettings.host) {
                console.log(`⚠️ Skipping checkout ${checkout._id}: No SMTP settings for store ${checkout.storeId}`);
                continue;
            }

            if (!store.marketingSettings?.abandonedCheckoutEnabled) {
                console.log(`ℹ️ Skipping checkout ${checkout._id}: Abandoned checkout automation disabled for store ${store.name}`);
                continue;
            }

            try {
                const cartItemsHtml = checkout.cartItems.map(item => `
                    <div style="display: flex; gap: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                        <img src="${item.image}" width="100" height="100" style="object-fit: cover;" />
                        <div>
                            <h4 style="margin: 0;">${item.name}</h4>
                            <p style="margin: 5px 0;">Qty: ${item.quantity} - ${store.currency} ${item.price}</p>
                        </div>
                    </div>
                `).join('');

                const checkoutLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/store/cart`; // Link back to cart

                const info = await sendEmail({
                    to: checkout.customerEmail,
                    subject: store.marketingSettings?.abandonedCheckoutEmailSubject || `Wait! You left something in your cart at ${store.name}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 20px;">
                            <h2 style="color: #6366f1;">Hi ${checkout.customerName || 'there'},</h2>
                            <p style="font-size: 16px; color: #444; line-height: 1.6;">
                                ${store.marketingSettings?.abandonedCheckoutEmailContent || "We noticed you left some items in your cart. We've saved them for you!"}
                            </p>
                            <div style="margin: 30px 0; border: 1px solid #f0f0f0; border-radius: 15px; padding: 20px; background: #fafafa;">
                                ${cartItemsHtml}
                            </div>
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${checkoutLink}" style="background-color: #6366f1; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 10px; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);">Complete Your Purchase</a>
                            </div>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                            <p style="font-size: 12px; color: #999; text-align: center;">If you have any questions, just reply to this email.</p>
                        </div>
                    `,
                    text: `Hi ${checkout.customerName || 'there'}, ${store.marketingSettings?.abandonedCheckoutEmailContent || "you left items in your cart"}. Visit ${checkoutLink} to complete your purchase.`
                }, store.smtpSettings);

                console.log(`📡 SMTP Response:`, info.response);
                checkout.recoveryEmailSent = true;
                checkout.recoveryEmailSentAt = new Date();
                await checkout.save();
                console.log(`✅ Recovery email sent to ${checkout.customerEmail}`);
            } catch (err) {
                console.error(`❌ Failed to send recovery email for checkout ${checkout._id}:`, err.message);
            }
        }
    } catch (error) {
        console.error('❌ Error in Abandoned Checkout Job:', error);
    }
};

const startAbandonedCheckoutJob = () => {
    // Run every 15 minutes
    setInterval(processAbandonedCheckouts, 15 * 60 * 1000);
    // Also run once on start
    processAbandonedCheckouts();
};

module.exports = { startAbandonedCheckoutJob };
