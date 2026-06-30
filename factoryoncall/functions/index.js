const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const Stripe = require("stripe");

admin.initializeApp();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

const FROM_EMAIL = "Factory On Call <factoryoncall@onetmediagroup.ca>";
const REPLY_TO_EMAIL = "factoryoncall@onetmediagroup.ca";
const FALLBACK_BASE_URL = "https://onetmediagroup.ca/factoryoncall/";

const FACTORY_ON_CALL_PRICES = {
  monthly: "price_1To9yq20LQ2pqINAwk3afElt",
  annual: "price_1ToA0V20LQ2pqINAhWLzOnih"
};

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeBaseUrl(value) {
  const raw = String(value || FALLBACK_BASE_URL).trim() || FALLBACK_BASE_URL;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function portalLinks(baseUrl, companyId) {
  const encoded = encodeURIComponent(companyId);
  return {
    admin: `${baseUrl}admin.html?companyId=${encoded}`,
    supervisor: `${baseUrl}supervisor.html?companyId=${encoded}`,
    call: `${baseUrl}call.html?companyId=${encoded}`,
    viewer: `${baseUrl}viewer.html?companyId=${encoded}`,
    display: `${baseUrl}display.html?companyId=${encoded}`
  };
}

function buildWelcomeEmail(data, companyId) {
  const plantName = data.companyName || data.displayName || "Factory On Call Plant";
  const firstName = data.ownerFirstName || data.contactName || "there";
  const adminUserId = data.adminUserId || data.adminId || data.adminPin || "1000";
  const adminPin = data.adminPin || "1000";
  const baseUrl = normalizeBaseUrl(data.portalBaseUrl);
  const links = portalLinks(baseUrl, companyId);
  const tutorialsUrl = "https://onetmediagroup.ca/factory-on-call.html";
  const supportEmail = "factoryoncall@onetmediagroup.ca";
  const isDemo = data.mode === "demo" || data.isDemo === true;
  const plantLabel = isDemo ? "Demo Plant" : "Production Plant";
  const createdLine = isDemo
    ? "Your demo plant has been created so you can explore the system before setting up a production plant."
    : "Your production plant has been created and is ready to use.";
  const adminNote = isDemo
    ? "Please keep this information in a safe place. You'll use your User ID and PIN to access the Factory On Call demo portals. Demo administration is locked, but the call workflow is fully usable."
    : "Please keep this information in a safe place. You'll use your User ID and PIN to access the Factory On Call management portals.";
  const nextStepsTitle = isDemo ? "Try these demo workflows" : "Recommended first steps";
  const nextSteps = isDemo
    ? [
        "Open the Admin Portal and review the sample plant.",
        "Open a Call Station and submit a standard call.",
        "Acknowledge the call from the Supervisor Portal.",
        "Test the emergency button.",
        "Review Analytics, History, and CSV exports."
      ]
    : [
        "Add your production users.",
        "Configure your work cells and areas.",
        "Test a standard production call.",
        "Test an emergency call.",
        "Open the Production Display on a TV or monitor."
      ];

  const subject = isDemo ? "Your Factory On Call Demo Plant Is Ready" : "Welcome to Factory On Call";

  const text = `Hi ${firstName},

Thanks for your interest in Factory On Call.

${createdLine}

${plantLabel}: ${plantName}
Plant Code: ${companyId}

Administrator Login
Administrator User ID: ${adminUserId}
Administrator PIN: ${adminPin}

${adminNote}

Open your Admin Portal here:
${links.admin}

Factory On Call helps production teams with:
- Live production call stations
- Supervisor queue management
- Interactive production viewer
- Production display boards
- Emergency response tracking
- Analytics and reporting
- CSV exports and call history

Additional Portal Links
Supervisor Portal:
${links.supervisor}

Interactive Viewer:
${links.viewer}

Production Display:
${links.display}

Call Station:
${links.call}

${nextStepsTitle}:
${nextSteps.map((item, index) => `${index + 1}. ${item}`).join("\n")}

${isDemo ? `When you are ready to create a production plant, start here:
${baseUrl}onboarding.html
` : ""}

Factory On Call tutorials and updates will be available here:
${tutorialsUrl}

Questions or support:
${supportEmail}

Thank you for choosing Factory On Call!
The Factory On Call Team
One T Media Group
`;

  const html = `
  <div style="font-family:Arial,sans-serif;background:#f6f8fb;padding:28px;color:#111827;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="padding:26px 28px;background:#0f172a;color:#ffffff;">
        <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#93c5fd;font-weight:800;">Factory On Call</div>
        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${isDemo ? "Your Demo Plant Is Ready" : "Welcome to Factory On Call"}</h1>
      </div>
      <div style="padding:28px;">
        <p style="font-size:16px;line-height:1.6;margin-top:0;">Hi ${esc(firstName)},</p>
        <p style="font-size:16px;line-height:1.6;">${isDemo ? "Thanks for your interest in" : "Thanks for choosing"} <strong>Factory On Call</strong>.</p>
        <p style="font-size:16px;line-height:1.6;">${esc(createdLine)}</p>

        <div style="margin:22px 0;padding:18px;border-radius:14px;background:#f9fafb;border:1px solid #e5e7eb;">
          <h2 style="font-size:18px;margin:0 0 14px;">Your Plant Information</h2>
          <p style="margin:8px 0;"><strong>${esc(plantLabel)}:</strong><br>${esc(plantName)}</p>
          <p style="margin:12px 0 0;"><strong>Plant Code:</strong><br><code style="display:inline-block;margin-top:4px;background:#eef2ff;padding:6px 8px;border-radius:8px;font-size:15px;">${esc(companyId)}</code></p>
        </div>

        <div style="margin:22px 0;padding:18px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;">
          <h2 style="font-size:18px;margin:0 0 14px;">Administrator Login</h2>
          <p style="margin:8px 0;"><strong>Administrator User ID:</strong><br><code style="display:inline-block;margin-top:4px;background:#ffffff;padding:6px 8px;border-radius:8px;font-size:15px;">${esc(adminUserId)}</code></p>
          <p style="margin:12px 0 0;"><strong>Administrator PIN:</strong><br><code style="display:inline-block;margin-top:4px;background:#ffffff;padding:6px 8px;border-radius:8px;font-size:15px;">${esc(adminPin)}</code></p>
          <p style="font-size:14px;line-height:1.5;color:#374151;margin:14px 0 0;">${esc(adminNote)}</p>
        </div>

        <h2 style="font-size:18px;margin:24px 0 10px;">Open your Admin Portal</h2>
        <p style="margin:10px 0 22px;"><a href="${links.admin}" style="color:#2563eb;font-weight:700;">${links.admin}</a></p>

        <h2 style="font-size:18px;margin:24px 0 10px;">Factory On Call helps production teams with:</h2>
        <ul style="font-size:15px;line-height:1.65;margin-top:8px;padding-left:22px;">
          <li>Live production call stations</li>
          <li>Supervisor queue management</li>
          <li>Interactive production viewer</li>
          <li>Production display boards</li>
          <li>Emergency response tracking</li>
          <li>Analytics and reporting</li>
          <li>CSV exports and call history</li>
        </ul>

        <h2 style="font-size:18px;margin:24px 0 10px;">Additional Portal Links</h2>
        <p style="margin:10px 0;"><strong>Supervisor Portal</strong><br><a href="${links.supervisor}" style="color:#2563eb;">${links.supervisor}</a></p>
        <p style="margin:10px 0;"><strong>Interactive Viewer</strong><br><a href="${links.viewer}" style="color:#2563eb;">${links.viewer}</a></p>
        <p style="margin:10px 0;"><strong>Production Display</strong><br><a href="${links.display}" style="color:#2563eb;">${links.display}</a></p>
        <p style="margin:10px 0;"><strong>Call Station</strong><br><a href="${links.call}" style="color:#2563eb;">${links.call}</a></p>

        <h2 style="font-size:18px;margin:24px 0 10px;">${esc(nextStepsTitle)}</h2>
        <ol style="font-size:15px;line-height:1.65;margin-top:8px;padding-left:22px;">
          ${nextSteps.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ol>
        ${isDemo ? `<div style="margin:20px 0;padding:16px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;"><strong>Ready for production?</strong><br>When you are ready to create a production plant, start here:<br><a href="${baseUrl}onboarding.html" style="color:#2563eb;">${baseUrl}onboarding.html</a></div>` : ""}

        <p style="font-size:15px;line-height:1.6;margin-top:24px;">Factory On Call tutorials and updates will be available here:<br><a href="${tutorialsUrl}" style="color:#2563eb;">${tutorialsUrl}</a></p>
        <p style="font-size:15px;line-height:1.6;">Questions or support:<br><a href="mailto:${supportEmail}" style="color:#2563eb;font-weight:700;">${supportEmail}</a></p>
        <p style="font-size:15px;line-height:1.6;margin-bottom:0;">Thank you for choosing Factory On Call!<br><strong>The Factory On Call Team</strong><br>One T Media Group</p>
      </div>
    </div>
  </div>`;

  return { subject, text, html };
}


function buildCorsResponse(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function adminIdForPlant() {
  return "1000";
}

function productionCompanyPayload({ companyId, firstName, lastName, email, plan, baseUrl, stripeCustomerId, stripeSubscriptionId, stripeSessionId }) {
  const contactName = `${firstName || ""} ${lastName || ""}`.trim() || "Factory On Call Admin";
  const companyName = `${contactName.split(" ")[0] || "Production"} Plant`;
  const adminPin = adminIdForPlant();
  return {
    companyId,
    companyName,
    contactName,
    contactEmail: email,
    ownerFirstName: firstName || "",
    ownerLastName: lastName || "",
    ownerEmail: email,
    mode: "production",
    plan: plan === "annual" ? "annual" : "monthly",
    stripeStatus: "active",
    stripeCustomerId: stripeCustomerId || "",
    stripeSubscriptionId: stripeSubscriptionId || "",
    stripeCheckoutSessionId: stripeSessionId || "",
    adminUserId: adminPin,
    adminPin,
    portalBaseUrl: normalizeBaseUrl(baseUrl),
    welcomeEmailStatus: "pending",
    isDemo: false,
    adminLocked: false,
    active: true,
    onboardingVersion: "v2-stripe-checkout",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function seedProductionCompany(companyId, payload) {
  const db = admin.firestore();
  const companyRef = db.collection("companies").doc(companyId);
  const existing = await companyRef.get();
  if (existing.exists) {
    logger.info("Production company already exists; skipping duplicate webhook create", { companyId });
    return;
  }

  await companyRef.set(payload, { merge: true });

  await db.collection("companies").doc(companyId).collection("settings").doc("main").set({
    requirePinForCalls: true,
    allowSharedStations: true,
    autoRefreshMinutes: 60,
    demoRestrictionsEnabled: false,
    playNewCallSound: true,
    playAcknowledgeSound: true,
    playClosedSound: true,
    playEmergencySound: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await db.collection("companies").doc(companyId).collection("settings").doc("emergency").set({
    enabled: false,
    active: false,
    soundEnabled: true,
    message: "Plant Emergency — follow company emergency procedures.",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await db.collection("companies").doc(companyId).collection("branding").doc("main").set({
    companyName: payload.companyName,
    primaryColor: "#1E90FF",
    secondaryColor: "#003366",
    logoUrl: "",
    theme: "light",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const roles = ["Maintenance", "Quality", "Supervisor", "Material Handler", "Team Lead", "Production Support"];
  for (const role of roles) {
    await db.collection("companies").doc(companyId).collection("roles").doc(role).set({
      name: role,
      active: true,
      permissions: {
        makeCall: true,
        viewCalls: true,
        acknowledgeCalls: role !== "Material Handler",
        closeCalls: role === "Supervisor" || role === "Maintenance" || role === "Quality"
      },
      isCallable: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  const stations = ["Press 400", "Press 401", "Assembly 1", "Assembly 2", "Packaging", "Receiving"];
  for (const station of stations) {
    const stationId = String(station).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "station";
    await db.collection("companies").doc(companyId).collection("stations").doc(stationId).set({
      companyId,
      stationId,
      name: station,
      description: "Production",
      cells: [station],
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  const adminPin = payload.adminPin || "1000";
  await db.collection("companies").doc(companyId).collection("users").doc(adminPin).set({
    companyId,
    firstName: payload.ownerFirstName || "",
    lastName: payload.ownerLastName || "",
    name: payload.contactName || "Factory On Call Admin",
    email: payload.ownerEmail || "",
    uid: adminPin,
    employeeNumber: adminPin,
    pin: adminPin,
    role: "Supervisor",
    dept: "Administration",
    admin: true,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await db.collection("companies").doc(companyId).collection("calls").doc("_seed_marker").set({
    marker: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    note: "Keeps calls collection initialized."
  }, { merge: true });

  await db.collection("companies").doc(companyId).collection("activity").doc("_seed_marker").set({
    marker: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    note: "Keeps activity collection initialized."
  }, { merge: true });
}

exports.createFactoryOnCallCheckoutSession = onRequest(
  {
    region: "us-central1",
    secrets: [STRIPE_SECRET_KEY]
  },
  async (req, res) => {
    buildCorsResponse(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const body = req.body || {};
      const plan = body.plan === "annual" ? "annual" : "monthly";
      const priceId = FACTORY_ON_CALL_PRICES[plan];
      const firstName = String(body.firstName || "").trim();
      const lastName = String(body.lastName || "").trim();
      const email = String(body.email || "").trim();
      const baseUrl = normalizeBaseUrl(body.baseUrl || FALLBACK_BASE_URL);
      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "A valid email is required." });
        return;
      }

      const companyId = admin.firestore().collection("companies").doc().id;
      const stripeSecretKey = STRIPE_SECRET_KEY.value();
      if (!stripeSecretKey || !stripeSecretKey.startsWith("sk_")) {
        logger.error("Factory On Call Stripe secret key is missing or invalid. Use a Stripe secret key that starts with sk_test_ or sk_live_.");
        res.status(500).json({ error: "Stripe is not configured correctly. STRIPE_SECRET_KEY must be a secret key, not a publishable key." });
        return;
      }
      const stripe = new Stripe(stripeSecretKey);
      const successUrl = `${baseUrl}onboarding.html?checkout=success&companyId=${encodeURIComponent(companyId)}&plan=${encodeURIComponent(plan)}`;
      const cancelUrl = `${baseUrl}onboarding.html?checkout=cancelled&plan=${encodeURIComponent(plan)}`;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          product: "factory_on_call",
          companyId,
          firstName,
          lastName,
          email,
          plan,
          baseUrl
        },
        subscription_data: {
          metadata: {
            product: "factory_on_call",
            companyId,
            plan
          }
        }
      });

      logger.info("Created Factory On Call checkout session", { companyId, plan, email });
      res.status(200).json({ url: session.url, sessionId: session.id, companyId });
    } catch (error) {
      logger.error("Failed to create Factory On Call checkout session", { error });
      res.status(500).json({ error: error?.message || "Could not create checkout session." });
    }
  }
);

exports.stripeWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET]
  },
  async (req, res) => {
    const stripeSecretKey = STRIPE_SECRET_KEY.value();
    if (!stripeSecretKey || !stripeSecretKey.startsWith("sk_")) {
      logger.error("Factory On Call Stripe webhook secret key is missing or invalid. Use a Stripe secret key that starts with sk_test_ or sk_live_.");
      res.status(500).send("Stripe secret key is not configured correctly.");
      return;
    }
    const stripe = new Stripe(stripeSecretKey);
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET.value());
    } catch (error) {
      logger.error("Factory On Call Stripe webhook signature failed", { error: error?.message || String(error) });
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const md = session.metadata || {};
        if (md.product !== "factory_on_call") {
          logger.info("Ignoring non Factory On Call checkout session", { sessionId: session.id });
          res.status(200).send("ignored");
          return;
        }

        const companyId = md.companyId;
        if (!companyId) throw new Error("Missing companyId in Stripe metadata.");

        const payload = productionCompanyPayload({
          companyId,
          firstName: md.firstName || "",
          lastName: md.lastName || "",
          email: md.email || session.customer_email || "",
          plan: md.plan || "monthly",
          baseUrl: md.baseUrl || FALLBACK_BASE_URL,
          stripeCustomerId: session.customer || "",
          stripeSubscriptionId: session.subscription || "",
          stripeSessionId: session.id
        });

        await seedProductionCompany(companyId, payload);
        logger.info("Factory On Call production plant activated by Stripe", { companyId, plan: payload.plan });
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        const companyId = subscription?.metadata?.companyId;
        if (companyId) {
          await admin.firestore().collection("companies").doc(companyId).set({
            stripeStatus: "cancelled",
            active: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          logger.info("Factory On Call subscription cancelled", { companyId });
        }
      }

      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription || "";
        logger.warn("Factory On Call invoice payment failed", { subscriptionId });
      }

      if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription || "";
        logger.info("Factory On Call invoice payment succeeded", { subscriptionId });
      }

      res.status(200).send("ok");
    } catch (error) {
      logger.error("Factory On Call Stripe webhook handler failed", { error });
      res.status(500).send("webhook handler failed");
    }
  }
);


exports.sendFactoryOnCallWelcome = onDocumentCreated(
  {
    document: "companies/{companyId}",
    region: "us-central1",
    secrets: [RESEND_API_KEY]
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const companyId = event.params.companyId;
    const data = snap.data() || {};

    if (!data.ownerEmail && !data.contactEmail) {
      logger.warn("Skipping welcome email because no owner email exists", { companyId });
      return;
    }

    const to = data.ownerEmail || data.contactEmail;
    const isDemo = data.mode === "demo" || data.isDemo === true;
    logger.info("Preparing Factory On Call welcome email", {
      companyId,
      to,
      mode: data.mode || "",
      isDemo
    });

    const resend = new Resend(RESEND_API_KEY.value());
    const email = buildWelcomeEmail(data, companyId);

    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        text: email.text,
        html: email.html
      });

      await snap.ref.set({
        welcomeEmailStatus: "sent",
        welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        welcomeEmailId: result?.data?.id || result?.id || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      logger.info("Factory On Call welcome email sent", { companyId, to });
    } catch (error) {
      logger.error("Factory On Call welcome email failed", { companyId, to, error });
      await snap.ref.set({
        welcomeEmailStatus: "failed",
        welcomeEmailError: error?.message || String(error),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      throw error;
    }
  }
);
