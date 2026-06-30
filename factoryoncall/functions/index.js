const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const FROM_EMAIL = "Factory On Call <factoryoncall@onetmediagroup.ca>";
const REPLY_TO_EMAIL = "factoryoncall2025@gmail.com";
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

  const subject = `Welcome to Factory On Call — ${plantName} is ready`;

  const text = `Hi ${firstName},\n\nWelcome to Factory On Call.\n\nYour Production Plant has been created.\n\nPlant Name: ${plantName}\nPlant Code: ${companyId}\n\nAdministrator Login\nUser ID: ${adminUserId}\nPIN: ${adminPin}\n\nUse your Administrator User ID and PIN to sign in to the Admin, Supervisor, and Viewer portals.\n\nPortal Links:\nAdmin Portal: ${links.admin}\nSupervisor Portal: ${links.supervisor}\nCall Station: ${links.call}\nInteractive Viewer: ${links.viewer}\nProduction Display: ${links.display}\n\nIf you have any questions, reply to this email.\n\nThank you for choosing Factory On Call.\n\n— One T Media Group\n`;

  const html = `
  <div style="font-family:Arial,sans-serif;background:#f6f8fb;padding:28px;color:#111827;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="padding:26px 28px;background:#0f172a;color:#ffffff;">
        <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd;font-weight:700;">Factory On Call</div>
        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">Your Production Plant is ready</h1>
      </div>
      <div style="padding:28px;">
        <p style="font-size:16px;line-height:1.6;margin-top:0;">Hi ${esc(firstName)},</p>
        <p style="font-size:16px;line-height:1.6;">Welcome to Factory On Call. Your Production Plant has been successfully created.</p>

        <div style="margin:22px 0;padding:18px;border-radius:14px;background:#f9fafb;border:1px solid #e5e7eb;">
          <h2 style="font-size:18px;margin:0 0 14px;">Plant Information</h2>
          <p style="margin:8px 0;"><strong>Plant Name:</strong> ${esc(plantName)}</p>
          <p style="margin:8px 0;"><strong>Plant Code:</strong> <code style="background:#eef2ff;padding:3px 6px;border-radius:6px;">${esc(companyId)}</code></p>
        </div>

        <div style="margin:22px 0;padding:18px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;">
          <h2 style="font-size:18px;margin:0 0 14px;">Administrator Login</h2>
          <p style="margin:8px 0;"><strong>User ID:</strong> <code style="background:#ffffff;padding:3px 6px;border-radius:6px;">${esc(adminUserId)}</code></p>
          <p style="margin:8px 0;"><strong>PIN:</strong> <code style="background:#ffffff;padding:3px 6px;border-radius:6px;">${esc(adminPin)}</code></p>
          <p style="font-size:14px;line-height:1.5;color:#374151;margin:12px 0 0;">Use your Administrator User ID and PIN to sign in to the Admin, Supervisor, and Viewer portals.</p>
        </div>

        <h2 style="font-size:18px;margin:22px 0 12px;">Portal Links</h2>
        <p style="margin:10px 0;"><a href="${links.admin}" style="color:#2563eb;font-weight:700;">Admin Portal</a></p>
        <p style="margin:10px 0;"><a href="${links.supervisor}" style="color:#2563eb;font-weight:700;">Supervisor Portal</a></p>
        <p style="margin:10px 0;"><a href="${links.call}" style="color:#2563eb;font-weight:700;">Call Station</a></p>
        <p style="margin:10px 0;"><a href="${links.viewer}" style="color:#2563eb;font-weight:700;">Interactive Viewer</a></p>
        <p style="margin:10px 0;"><a href="${links.display}" style="color:#2563eb;font-weight:700;">Production Display</a></p>

        <p style="font-size:15px;line-height:1.6;margin-top:24px;">If you have any questions, reply to this email.</p>
        <p style="font-size:15px;line-height:1.6;margin-bottom:0;">Thank you for choosing Factory On Call.<br>— One T Media Group</p>
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

    if (data.mode !== "production") {
      logger.info("Skipping welcome email for non-production plant", { companyId, mode: data.mode });
      return;
    }

    if (!data.ownerEmail && !data.contactEmail) {
      logger.warn("Skipping welcome email because no owner email exists", { companyId });
      return;
    }

    const to = data.ownerEmail || data.contactEmail;
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
