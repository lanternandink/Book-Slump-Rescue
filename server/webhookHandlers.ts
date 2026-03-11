import { getStripeSync } from './stripeClient';
import fs from 'fs';
import path from 'path';
import { db } from './db';
import { adRequests, indieSpotlights, mediaKitSubscriptions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const PAYMENTS_PATH = path.join(process.cwd(), "data", "payments.json");
const NEWSLETTER_REQUESTS_PATH = path.join(process.cwd(), "data", "newsletterRequests.json");

function readJsonFile(filePath: string): any[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeJsonFile(filePath: string, data: any[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const event = JSON.parse(payload.toString());
      if (event.type === "checkout.session.completed") {
        await WebhookHandlers.handleCheckoutCompleted(event.data?.object);
      } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        await WebhookHandlers.handleSubscriptionUpdate(event.data?.object);
      }
    } catch (err) {
      console.error("Payment tracking in webhook failed (non-fatal):", err);
    }
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    const metadata = session?.metadata || {};
    const { itemType, itemId } = metadata;
    if (!itemType) return;

    if (itemType === "media_kit_subscription") {
      try {
        const userId = metadata.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        if (!userId || !subscriptionId) return;

        const [existing] = await db.select({ id: mediaKitSubscriptions.id })
          .from(mediaKitSubscriptions)
          .where(eq(mediaKitSubscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);
        if (existing) {
          console.log(`Media Kit subscription ${subscriptionId} already exists, skipping duplicate`);
          return;
        }

        let periodStart = new Date();
        let periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
        try {
          const { getUncachableStripeClient } = await import('./stripeClient');
          const stripe = await getUncachableStripeClient();
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          if (sub.current_period_start) periodStart = new Date(sub.current_period_start * 1000);
          if (sub.current_period_end) periodEnd = new Date(sub.current_period_end * 1000);
        } catch (stripeErr) {
          console.warn("Could not fetch subscription details from Stripe, using defaults:", stripeErr);
        }

        await db.insert(mediaKitSubscriptions).values({
          userId,
          stripeCustomerId: customerId || null,
          stripeSubscriptionId: subscriptionId,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        });

        console.log(`Media Kit subscription created for user ${userId} (sub: ${subscriptionId}) via Stripe`);
      } catch (err) {
        console.error("Failed to create media kit subscription via webhook:", err);
      }
      return;
    }

    if (itemType === "placement") {
      try {
        const orderId = session.id;
        if (orderId) {
          const existing = await db.select({ id: indieSpotlights.id }).from(indieSpotlights).where(eq(indieSpotlights.orderId, orderId)).limit(1);
          if (existing.length > 0) {
            console.log(`Placement for session ${orderId} already exists, skipping duplicate`);
            return;
          }
        }

        const durationDays = parseInt(metadata.durationDays || "7", 10);
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const pricePaid = session.amount_total || 0;
        const genres = metadata.genres ? metadata.genres.split(",").map((g: string) => g.trim()).filter(Boolean) : [];

        await db.insert(indieSpotlights).values({
          authorName: metadata.authorName || "Unknown",
          penName: metadata.penName || null,
          bookTitle: metadata.bookTitle || "Untitled",
          genres,
          shortBlurb: metadata.shortBlurb || "",
          coverImageUrl: metadata.coverImageUrl || null,
          buyLinks: metadata.buyLinks || null,
          spotlightType: "sponsored",
          placement: metadata.placementType || "spotlight",
          isActive: true,
          priority: metadata.placementType === "frontpage" ? 10 : 0,
          startDate,
          endDate,
          durationDays,
          pricePaid,
          placementType: metadata.placementType || "spotlight",
          orderId: orderId || null,
        });

        console.log(`Placement auto-created: ${metadata.bookTitle} (${durationDays}d ${metadata.placementType}) via Stripe`);
      } catch (err) {
        console.error("Failed to create placement via webhook:", err);
      }
      return;
    }

    if (!itemId) return;

    const payments = readJsonFile(PAYMENTS_PATH);
    const paymentIdx = payments.findIndex(
      (p: any) => p.itemId === itemId && p.itemType === itemType
    );
    if (paymentIdx !== -1) {
      payments[paymentIdx].status = "paid";
      payments[paymentIdx].paidAt = new Date().toISOString();
      writeJsonFile(PAYMENTS_PATH, payments);
      console.log(`Payment [${payments[paymentIdx].id}] confirmed via webhook`);
    }

    if (itemType === "ad") {
      try {
        await db.update(adRequests)
          .set({ status: "paid" })
          .where(and(eq(adRequests.id, itemId), eq(adRequests.status, "approved-pending-payment")));
      } catch (err) {
        console.error("Failed to update ad request status via webhook:", err);
      }
    } else if (itemType === "newsletter") {
      const requests = readJsonFile(NEWSLETTER_REQUESTS_PATH);
      const idx = requests.findIndex((r: any) => r.id === itemId);
      if (idx !== -1 && requests[idx].status === "approved-pending-payment") {
        requests[idx].status = "paid";
        writeJsonFile(NEWSLETTER_REQUESTS_PATH, requests);
      }
    }
  }

  static async handleSubscriptionUpdate(subscription: any): Promise<void> {
    if (!subscription?.id) return;

    try {
      const subId = subscription.id;
      const [existing] = await db.select().from(mediaKitSubscriptions)
        .where(eq(mediaKitSubscriptions.stripeSubscriptionId, subId))
        .limit(1);
      if (!existing) return;

      const status = subscription.status === "active" ? "active"
        : subscription.status === "canceled" || subscription.status === "unpaid" ? "canceled"
        : subscription.status === "past_due" ? "past_due"
        : existing.status;

      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : existing.currentPeriodEnd;
      const periodStart = subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : existing.currentPeriodStart;
      const canceledAt = subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : existing.canceledAt;

      await db.update(mediaKitSubscriptions)
        .set({
          status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          canceledAt,
        })
        .where(eq(mediaKitSubscriptions.id, existing.id));

      console.log(`Media Kit subscription ${subId} updated to status: ${status}`);
    } catch (err) {
      console.error("Failed to update media kit subscription via webhook:", err);
    }
  }
}
