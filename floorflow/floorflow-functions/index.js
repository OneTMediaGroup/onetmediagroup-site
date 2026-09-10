const { FieldValue } = require("firebase-admin/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const { Resend } = require("resend");

admin.initializeApp();
const access = require('./access');
const onboarding = require('./onboarding');
const billing = require('./billing');
exports.floorFlowSignIn = access.plantSignIn;
exports.floorFlowSession = access.plantSession;
exports.saveFloorFlowUser = access.savePlantUser;
exports.deleteFloorFlowUser = access.deletePlantUser;
exports.reserveFloorFlowPlant = onboarding.reservePlant;
exports.finishFloorFlowPlant = onboarding.finishPlant;
exports.createCheckoutSession = billing.createCheckoutSession;
exports.stripeWebhook = billing.stripeWebhook;
exports.createFloorFlowPortal = billing.createPortal;
exports.processFloorFlowOutbox = require('./outbox').processOutbox;

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
  if (origin === "https://onetmediagroup.ca" || origin === "https://www.onetmediagroup.ca") return origin;
  if (process.env.FUNCTIONS_EMULATOR === "true" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return "https://onetmediagroup.ca";
}

function applyCors(req, res) {
  res.set("Access-Control-Allow-Origin", allowedCorsOrigin(req.headers.origin || ""));
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

  const contactId = require('node:crypto').createHash('sha256').update(cleanEmail).digest('hex');
  const ref=db.collection('floorFlowContacts').doc(contactId);
  await db.runTransaction(async tx=>{
   const old=(await tx.get(ref)).data()||{};
   const data={email:cleanEmail,tags:FieldValue.arrayUnion(source),updatedAt:FieldValue.serverTimestamp(),createdAt:old.createdAt||FieldValue.serverTimestamp()};
   for(const [key,value] of Object.entries({firstName,lastName,fullName,plantId,plantName,plan}))if(value)data[key]=value;
   if(old.status!=='customer'){data.status=status;data.source=source;}
   tx.set(ref,data,{merge:true});
  });

  return { saved: true, contactId };
}

function isValidEmail(email=''){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());}

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
  const result = await resend.emails.send({
    from: "Floor Flow <floorflow@onetmediagroup.ca>",
    to,
    replyTo: "floorflow@onetmediagroup.ca",
    subject,
    text,
    html: textToHtml(text)
  });
  if (result?.error || !result?.data?.id) {
    throw new Error(result?.error?.message || "Email provider did not accept the message.");
  }
  return result;
}


exports.sendFloorFlowDemoWelcome = access.route(async(req,res)=>{
 const plantId=req.body?.plantId;await access.member(req,plantId,['admin']);
 const plant=await db.doc(`plants/${plantId}`).get();
 if(!plant.data()?.isDemo)access.fail(400,'This plant is not a demo.');
 const ref=db.doc(`_floorFlowOutbox/welcome-${plantId}`);
 await db.runTransaction(async tx=>{if(!(await tx.get(ref)).exists)tx.set(ref,{plantId,kind:'demo',state:'pending'});});
 res.json({ok:true,queued:true});
});

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

      const successful = sendResults.filter(result => result.id && !result.error);
      for (const { to: recipient } of successful) {
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
        sent: successful.length,
        sendResults,
        createdAt: FieldValue.serverTimestamp()
      });

      res.status(200).json({ ok: successful.length === to.length, sent: successful.length, failed: to.length - successful.length, results: sendResults });
    } catch (error) {
      console.error("sendFloorFlowCommunication failed:", error);
      res.status(500).json({ error: error.message || "Email send failed." });
    }
  }
);
