const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const { Resend } = require("resend");

admin.initializeApp();

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const STRIPE_MONTHLY_PRICE_ID = defineSecret("STRIPE_MONTHLY_PRICE_ID");
const STRIPE_YEARLY_PRICE_ID = defineSecret("STRIPE_YEARLY_PRICE_ID");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const ONET_ADMIN_SEND_KEY = defineSecret("ONET_ADMIN_SEND_KEY");

const db = admin.firestore();


function normalizePlan(plan = "monthly") {
  return plan === "yearly" || plan === "annual" ? "yearly" : "monthly";
}

function allowedCorsOrigin(origin = "") {
  // Local dev, Firebase Hosting, GitHub Pages/custom domain later.
  if (!origin) return "*";
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)) return origin;
  if (/^https:\/\/.*\.web\.app$/i.test(origin)) return origin;
  if (/^https:\/\/.*\.firebaseapp\.com$/i.test(origin)) return origin;
  if (/^https:\/\/.*github\.io$/i.test(origin)) return origin;
  return origin;
}

function applyCors(req, res) {
  res.set("Access-Control-Allow-Origin", allowedCorsOrigin(req.headers.origin || ""));
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}


function normalizePlanFromSession(session) {
  const metadataPlan = session?.metadata?.plan || session?.metadata?.billingPlan;
  const clientRef = session?.client_reference_id || "";
  const paymentLink = session?.payment_link || "";

  if (metadataPlan === "yearly" || metadataPlan === "annual") return "yearly";
  if (metadataPlan === "monthly") return "monthly";

  if (String(clientRef).toLowerCase().includes("year")) return "yearly";
  if (String(clientRef).toLowerCase().includes("month")) return "monthly";

  if (paymentLink) return "unknown";

  return "unknown";
}

function getPlantIdFromSession(session) {
  return (
    session?.metadata?.plantId ||
    session?.metadata?.plant_id ||
    session?.client_reference_id ||
    ""
  ).trim();
}

async function findPlantByStripeCustomer(stripeCustomerId) {
  if (!stripeCustomerId) return null;

  const snap = await db
    .collection("plants")
    .where("stripeCustomerId", "==", stripeCustomerId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].ref;
}

async function upsertFloorFlowContact({
  email,
  firstName = "",
  lastName = "",
  fullName = "",
  source = "unknown",
  plantId = "",
  plantName = "",
  plan = "",
  status = "active"
}) {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!isValidEmail(cleanEmail)) {
    return { saved: false, reason: "invalid_email" };
  }

  const contactId = cleanEmail.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("floorFlowContacts").doc(contactId).set({
    email: cleanEmail,
    firstName: firstName || "",
    lastName: lastName || "",
    fullName: fullName || `${firstName || ""} ${lastName || ""}`.trim(),
    source,
    plantId: plantId || "",
    plantName: plantName || "",
    plan: plan || "",
    status,
    tags: admin.firestore.FieldValue.arrayUnion(source),
    updatedAt: now,
    createdAt: now
  }, { merge: true });

  return { saved: true, contactId };
}

function buildDemoWelcomeText({ firstName = "", plantName = "Demo Plant", plantId = "" } = {}) {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";

  return `${greeting}

Thanks for your interest in Floor Flow.

Your demo plant has been created so you can explore the system before setting up a production plant.

Demo Plant: ${plantName}
Demo Plant Code: ${plantId}

You can continue testing Floor Flow here:
https://onetmediagroup.ca/floorflow/admin.html?plantId=${plantId}

Floor Flow gives production teams:
- Live display boards
- Supervisor queue control
- Touch screen floor views
- Parts library support
- Plant-specific access links

When you are ready to create a production plant, start here:
https://onetmediagroup.ca/floorflow/onboarding.html

Floor Flow tutorials and updates will be available here:
https://onetmediagroup.ca/floor-flow.html

Questions or support:
floorflow@onetmediagroup.ca

Thank Your For Chosing Floor Flow!
The Floor Flow Team
One T Media Group`;
}


function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

async function sendWelcomeEmailIfNeeded({ plantRef, email, billingPlan }) {
  const cleanEmail = String(email || "").trim();
  if (!plantRef || !isValidEmail(cleanEmail)) {
    return { emailQueued: false, reason: "missing_or_invalid_email" };
  }

  const plantSnap = await plantRef.get();
  const plantData = plantSnap.exists ? plantSnap.data() || {} : {};

  if (plantData.welcomeEmailSentAt) {
    return { emailQueued: false, reason: "already_sent" };
  }

  const plantId = plantRef.id;
  const plantName = plantData.plantName || plantData.name || "Floor Flow Plant";
  const planText = billingPlan === "yearly" ? "Annual" : billingPlan === "monthly" ? "Monthly" : "Active";

  const text = `Thank you for subscribing to Floor Flow Pro.

Your production plant has been activated.

Plant Name: ${plantName}
Plant Code: ${plantId}
Plan: ${planText}

Keep this Plant Code in a safe place. If onboarding is interrupted, you can return to Floor Flow onboarding and continue setup using this plant.

Your plant links are available inside the Admin panel after setup is complete.

Questions or Support?
floorflow@onetmediagroup.ca

Thanks for chosing Floor Flow!
One T Media Group
Floor Flow`;

  await sendWithResend({
    to: cleanEmail,
    subject: "Welcome to Floor Flow Pro",
    text
  });

 
  await upsertFloorFlowContact({
    email: cleanEmail,
    source: "paid_customer",
    plantId,
    plantName,
    plan: billingPlan || "",
    status: "customer"
  });

  await plantRef.set({
    welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
    welcomeEmailTo: cleanEmail
  }, { merge: true });

  return { emailQueued: true, to: cleanEmail };
}

async function markPlantActive({ plantId, stripeCustomerId, stripeSubscriptionId, billingPlan, email }) {
  let plantRef = plantId ? db.collection("plants").doc(plantId) : null;

  if (!plantRef && stripeCustomerId) {
    plantRef = await findPlantByStripeCustomer(stripeCustomerId);
  }

  const payload = {
    billingStatus: "active",
    subscriptionStatus: "active",
    productionUnlocked: true,
    paid: true,
    billingPlan: billingPlan || "unknown",
    stripeCustomerId: stripeCustomerId || "",
    stripeSubscriptionId: stripeSubscriptionId || "",
    billingEmail: email || "",
    billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (plantRef) {
    await plantRef.set(payload, { merge: true });
    const emailResult = await sendWelcomeEmailIfNeeded({
      plantRef,
      email,
      billingPlan: payload.billingPlan
    });
    return { updatedPlant: plantRef.id, ...emailResult };
  }

  const fallbackId = stripeCustomerId || stripeSubscriptionId || `unlinked-${Date.now()}`;
  await db.collection("billingCustomers").doc(fallbackId).set({
    ...payload,
    plantId: plantId || "",
    needsPlantLink: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { updatedPlant: null, fallbackId };
}

async function markPlantInactive({ stripeCustomerId, stripeSubscriptionId, reason }) {
  let plantRef = null;

  if (stripeCustomerId) {
    plantRef = await findPlantByStripeCustomer(stripeCustomerId);
  }

  const payload = {
    billingStatus: "inactive",
    subscriptionStatus: "inactive",
    productionUnlocked: false,
    paid: false,
    stripeSubscriptionId: stripeSubscriptionId || "",
    billingLockReason: reason || "subscription_inactive",
    billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (plantRef) {
    await plantRef.set(payload, { merge: true });
    return { lockedPlant: plantRef.id };
  }

  if (stripeCustomerId || stripeSubscriptionId) {
    const fallbackId = stripeCustomerId || stripeSubscriptionId;
    await db.collection("billingCustomers").doc(fallbackId).set(payload, { merge: true });
    return { lockedPlant: null, fallbackId };
  }

  return { lockedPlant: null };
}


function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(value = "") {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function parseEmailList(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[\n,;]/);
  return [...new Set(raw.map((item) => String(item || "").trim()).filter(isValidEmail))];
}

async function sendWithResend({ to, subject, text }) {
  const resend = new Resend(RESEND_API_KEY.value());
  return resend.emails.send({
    from: "Floor Flow <floorflow@onetmediagroup.ca>",
    to,
    replyTo: "floorflow@onetmediagroup.ca",
    subject,
    text,
    html: textToHtml(text)
  });
}


exports.createCheckoutSession = onRequest(
  {
    region: "northamerica-northeast1",
    secrets: [STRIPE_SECRET_KEY, STRIPE_MONTHLY_PRICE_ID, STRIPE_YEARLY_PRICE_ID]
  },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const body = typeof req.body === "object" && req.body ? req.body : {};
      const plantId = String(body.plantId || "").trim();
      const plan = normalizePlan(body.plan || "monthly");
      const plantName = String(body.plantName || "Floor Flow Plant").trim().slice(0, 120);
      const customerEmail = String(body.customerEmail || "").trim();
      const origin = body.origin || req.headers.origin || "";
      const successUrl = body.successUrl || `${origin}/onboarding.html?mode=production&payment=success&plan=${plan}&plantId=${encodeURIComponent(plantId)}&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = body.cancelUrl || `${origin}/onboarding.html?mode=production&checkout=cancelled&plan=${plan}&plantId=${encodeURIComponent(plantId)}`;

      if (!plantId) {
        res.status(400).json({ error: "Missing plantId." });
        return;
      }

      const priceId = plan === "yearly" ? STRIPE_YEARLY_PRICE_ID.value() : STRIPE_MONTHLY_PRICE_ID.value();

      if (!priceId || !priceId.startsWith("price_")) {
        res.status(500).json({ error: `Stripe ${plan} price ID is not configured.` });
        return;
      }

      await db.collection("plants").doc(plantId).set({
        plantId,
        id: plantId,
        plantName,
        name: plantName,
        environment: "production",
        mode: "production",
        isDemo: false,
        billingPlan: plan,
        billingStatus: "checkout_started",
        subscriptionStatus: "pending_checkout",
        productionUnlocked: false,
        checkoutStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const sessionConfig = {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: plantId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          plantId,
          plan,
          billingPlan: plan,
          plantName
        },
        subscription_data: {
          metadata: {
            plantId,
            plan,
            billingPlan: plan,
            plantName
          }
        },
     
        allow_promotion_codes: true,
        billing_address_collection: "required",
        
      };

      if (customerEmail && customerEmail.includes("@")) {
        sessionConfig.customer_email = customerEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      res.status(200).json({ url: session.url, id: session.id });
    } catch (error) {
      console.error("createCheckoutSession failed:", error);
      res.status(500).json({ error: error.message || "Could not create checkout session." });
    }
  }
);

exports.stripeWebhook = onRequest(
  {
    region: "northamerica-northeast1",
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY]
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const signature = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (error) {
      console.error("Stripe webhook signature verification failed:", error.message);
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;

          const result = await markPlantActive({
            plantId: getPlantIdFromSession(session),
            stripeCustomerId: session.customer || "",
            stripeSubscriptionId: session.subscription || "",
            billingPlan: normalizePlanFromSession(session),
            email: session.customer_details?.email || session.customer_email || ""
          });

          console.log("checkout.session.completed processed", result);
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          const activeStates = new Set(["active", "trialing"]);

          if (activeStates.has(subscription.status)) {
            const result = await markPlantActive({
              plantId: subscription.metadata?.plantId || subscription.metadata?.plant_id || "",
              stripeCustomerId: subscription.customer || "",
              stripeSubscriptionId: subscription.id || "",
              billingPlan: subscription.metadata?.plan || subscription.metadata?.billingPlan || "unknown",
              email: ""
            });

            console.log(`${event.type} active processed`, result);
          } else {
            const result = await markPlantInactive({
              stripeCustomerId: subscription.customer || "",
              stripeSubscriptionId: subscription.id || "",
              reason: `subscription_${subscription.status}`
            });

            console.log(`${event.type} inactive processed`, result);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object;

          const result = await markPlantInactive({
            stripeCustomerId: subscription.customer || "",
            stripeSubscriptionId: subscription.id || "",
            reason: "subscription_deleted"
          });

          console.log("customer.subscription.deleted processed", result);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object;

          const result = await markPlantInactive({
            stripeCustomerId: invoice.customer || "",
            stripeSubscriptionId: invoice.subscription || "",
            reason: "invoice_payment_failed"
          });

          console.log("invoice.payment_failed processed", result);
          break;
        }

        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook processing failed:", error);
      res.status(500).send("Webhook handler failed");
    }
  }
);



exports.sendFloorFlowDemoWelcome = onRequest(
  {
    region: "northamerica-northeast1",
    secrets: [RESEND_API_KEY]
  },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const body = typeof req.body === "object" && req.body ? req.body : {};
      const plantId = String(body.plantId || "").trim();
      const email = String(body.email || "").trim().toLowerCase();

      if (!plantId || !isValidEmail(email)) {
        res.status(400).json({ error: "Valid plantId and email are required." });
        return;
      }

      const plantRef = db.collection("plants").doc(plantId);
      const snap = await plantRef.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Demo plant not found." });
        return;
      }

      const plant = snap.data() || {};
      const isDemo = plant.isDemo === true || plant.mode === "demo" || plant.environment === "demo";
      const contact = plant.onboardingContact || {};
      const registeredEmail = String(contact.email || plant.demoContactEmail || "").trim().toLowerCase();

      if (!isDemo) {
        res.status(403).json({ error: "Demo welcome email is only available for demo plants." });
        return;
      }

      if (registeredEmail && registeredEmail !== email) {
        res.status(403).json({ error: "Email does not match this demo plant." });
        return;
      }

      if (plant.demoWelcomeEmailSentAt) {
        await upsertFloorFlowContact({
          email,
          firstName: contact.firstName || "",
          lastName: contact.lastName || "",
          fullName: contact.fullName || "",
          source: "demo_user",
          plantId,
          plantName: plant.plantName || plant.name || "Demo Plant",
          status: "demo"
        });

        res.status(200).json({ ok: true, alreadySent: true });
        return;
      }

      const firstName = contact.firstName || "";
      const text = buildDemoWelcomeText({
        firstName,
        plantName: plant.plantName || plant.name || "Demo Plant",
        plantId
      });

      await sendWithResend({
        to: email,
        subject: "Thanks for trying the Floor Flow Demo",
        text
      });

      await upsertFloorFlowContact({
        email,
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        fullName: contact.fullName || "",
        source: "demo_user",
        plantId,
        plantName: plant.plantName || plant.name || "Demo Plant",
        status: "demo"
      });

      await plantRef.set({
        demoWelcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        demoWelcomeEmailTo: email
      }, { merge: true });

      res.status(200).json({ ok: true, sent: true });
    } catch (error) {
      console.error("sendFloorFlowDemoWelcome failed:", error);
      res.status(500).json({ error: error.message || "Demo welcome email failed." });
    }
  }
);

exports.listFloorFlowContacts = onRequest(
  {
    region: "northamerica-northeast1",
    secrets: [ONET_ADMIN_SEND_KEY]
  },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const body = typeof req.body === "object" && req.body ? req.body : {};
      const adminKey = String(body.adminKey || "").trim();

      if (!adminKey || adminKey !== ONET_ADMIN_SEND_KEY.value()) {
        res.status(403).json({ error: "Not authorized." });
        return;
      }

      const snap = await db.collection("floorFlowContacts")
        .orderBy("updatedAt", "desc")
        .limit(500)
        .get();

      const contacts = snap.docs.map((docSnap) => {
        const data = docSnap.data() || {};
        return {
          id: docSnap.id,
          email: data.email || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          fullName: data.fullName || "",
          source: data.source || "",
          status: data.status || "",
          plantId: data.plantId || "",
          plantName: data.plantName || "",
          plan: data.plan || ""
        };
      }).filter((contact) => contact.email);

      res.status(200).json({ ok: true, contacts });
    } catch (error) {
      console.error("listFloorFlowContacts failed:", error);
      res.status(500).json({ error: error.message || "Could not load contacts." });
    }
  }
);


exports.sendFloorFlowCommunication = onRequest(
  {
    region: "northamerica-northeast1",
    secrets: [RESEND_API_KEY, ONET_ADMIN_SEND_KEY]
  },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const body = typeof req.body === "object" && req.body ? req.body : {};
      const adminKey = String(body.adminKey || "").trim();

      if (!adminKey || adminKey !== ONET_ADMIN_SEND_KEY.value()) {
        res.status(403).json({ error: "Not authorized." });
        return;
      }

      const to = parseEmailList(body.to);
      const subject = String(body.subject || "").trim().slice(0, 160);
      const text = String(body.text || "").trim();

      if (!to.length) {
        res.status(400).json({ error: "At least one valid recipient is required." });
        return;
      }

      if (to.length > 100) {
        res.status(400).json({ error: "Limit each send to 100 recipients or fewer." });
        return;
      }

      if (!subject || !text) {
        res.status(400).json({ error: "Subject and message are required." });
        return;
      }

      const resend = new Resend(RESEND_API_KEY.value());
      const html = textToHtml(text);

      const sendResults = [];

      for (const recipient of to) {
        const result = await resend.emails.send({
          from: "Floor Flow <floorflow@onetmediagroup.ca>",
          to: recipient,
          replyTo: "floorflow@onetmediagroup.ca",
          subject,
          text,
          html
        });

        sendResults.push({
          to: recipient,
          id: result?.data?.id || result?.id || "",
          error: result?.error?.message || ""
        });
      }

      for (const recipient of to) {
        await upsertFloorFlowContact({
          email: recipient,
          source: "manual_send",
          status: "contact"
        });
      }

      await db.collection("floorFlowCommunications").add({
        to,
        subject,
        preview: text.slice(0, 240),
        sent: sendResults.length,
        sendResults,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({ ok: true, sent: sendResults.length, results: sendResults });
    } catch (error) {
      console.error("sendFloorFlowCommunication failed:", error);
      res.status(500).json({ error: error.message || "Email send failed." });
    }
  }
);
