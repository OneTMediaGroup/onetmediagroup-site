const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const FROM_EMAIL = "Factory On Call <factoryoncall@onetmediagroup.ca>";
const REPLY_TO_EMAIL = "factoryoncall@onetmediagroup.ca";
const FALLBACK_BASE_URL = "https://onetmediagroup.ca/factoryoncall/";

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
