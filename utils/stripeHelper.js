import { getUncachableStripeClient } from "../server/stripeClient.js";

const AD_PRICING = {
  homepage: 5000,
  spotlight: 3000,
  featured: 2500,
};

const NEWSLETTER_PRICING = 1500;

export function getAmountForItem(itemType, adType) {
  if (itemType === "newsletter") return NEWSLETTER_PRICING;
  return AD_PRICING[adType] || 2500;
}

export async function createStripeLink(itemType, itemId, amount) {
  if (typeof amount !== "number" || amount < 500) {
    throw new Error(`Invalid amount: ${amount}. Minimum is $5.00 (500 cents).`);
  }

  try {
    const stripe = await getUncachableStripeClient();

    const product = await stripe.products.create({
      name: `${itemType.toUpperCase()} Request #${itemId}`,
      metadata: { itemType, itemId },
    });

    const price = await stripe.prices.create({
      unit_amount: amount,
      currency: "usd",
      product: product.id,
    });

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { itemType, itemId },
      payment_intent_data: {
        metadata: { itemType, itemId },
      },
    });

    console.log(`Stripe link created: ${link.url}`);
    return link.url;
  } catch (err) {
    console.error(`Stripe error creating payment link for ${itemType} #${itemId}:`, err.message || err);
    throw err;
  }
}
