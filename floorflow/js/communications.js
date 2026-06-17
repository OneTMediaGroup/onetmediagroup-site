const SEND_ENDPOINT = "https://northamerica-northeast1-die-changeover-board.cloudfunctions.net/sendFloorFlowCommunication";
const LIST_CONTACTS_ENDPOINT = "https://northamerica-northeast1-die-changeover-board.cloudfunctions.net/listFloorFlowContacts";

const templates = [
  {
    id: "launch-feeler",
    name: "Launch Feeler",
    subject: "Floor Flow is getting close",
    message: `Hello,

I wanted to send a quick update that Floor Flow is getting close to launch.

Floor Flow is a practical plant-floor system built to help teams manage work-cell flow, supervisor queues, live display boards, setup visibility, parts, and production communication from one clean system.

We are currently finishing final launch testing around onboarding, subscriptions, and production plant setup.

If you would like early access or want to see the system when it is ready, reply to this email and I will keep you on the update list.

Thanks,

The Floor Flow Team
One T Media Group`
  },
  {
    id: "launch-live",
    name: "Launch Announcement",
    subject: "Floor Flow Pro is now available",
    message: `Hello,

Floor Flow Pro is now available.

Floor Flow is designed for production plants that need a cleaner way to manage work cells, supervisor queues, live display boards, parts, setup flow, and plant visibility.

You can learn more here:
https://onetmediagroup.ca/floor-flow.html

Questions or support:
floorflow@onetmediagroup.ca

Thanks,

The Floor Flow Team
One T Media Group`
  },
  {
    id: "feature-update",
    name: "Feature Update",
    subject: "Floor Flow update",
    message: `Hello,

We have released a new Floor Flow update.

What's new:
- Improved supervisor queue flow
- Cleaner plant access links
- Better display board visibility
- Production onboarding polish

Questions or support:
floorflow@onetmediagroup.ca

Thanks,

The Floor Flow Team`
  },
  {
    id: "maintenance",
    name: "Maintenance Notice",
    subject: "Floor Flow maintenance notice",
    message: `Hello,

We are planning a short Floor Flow maintenance window.

Expected impact:
- Brief access interruption may occur
- Existing plant data will remain safe
- Normal access will resume after maintenance is complete

Questions or support:
floorflow@onetmediagroup.ca

Thanks,

The Floor Flow Team`
  },
  {
    id: "renewal",
    name: "Subscription Renewal Reminder",
    subject: "Floor Flow subscription reminder",
    message: `Hello,

This is a friendly reminder regarding your Floor Flow subscription.

Your plant access remains active while your subscription is current. If your payment method needs attention, Stripe may send a secure billing notice.

Questions or support:
floorflow@onetmediagroup.ca

Thanks,

The Floor Flow Team`
  }
];

const $ = (id) => document.getElementById(id);

init();

function init() {
  const savedKey = sessionStorage.getItem("floorflow_private_send_key") || "";
  $("sendKey").value = savedKey;

  $("templateSelect").innerHTML = templates
    .map((template) => `<option value="${template.id}">${template.name}</option>`)
    .join("");

  $("templateSelect").addEventListener("change", applySelectedTemplate);
  $("saveKeyBtn").addEventListener("click", saveKey);
  $("sendTestBtn").addEventListener("click", () => sendEmail(true));
  $("sendBtn").addEventListener("click", () => sendEmail(false));
  $("loadContactsBtn")?.addEventListener("click", loadSavedContacts);

  applySelectedTemplate();
}

function saveKey() {
  sessionStorage.setItem("floorflow_private_send_key", $("sendKey").value.trim());
  setStatus("Private key saved for this browser session.");
}

function applySelectedTemplate() {
  const selected = templates.find((template) => template.id === $("templateSelect").value) || templates[0];
  $("subject").value = selected.subject;
  $("message").value = selected.message;
}

function parseRecipients(value) {
  return String(value || "")
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setStatus(message, isError = false) {
  const status = $("sendStatus");
  status.textContent = message;
  status.classList.toggle("error-text", Boolean(isError));
}


function mergeRecipients(newEmails) {
  const current = parseRecipients($("recipients").value);
  const merged = [...new Set([...current, ...newEmails])];
  $("recipients").value = merged.join("\n");
}

function setContactsStatus(message, isError = false) {
  const el = $("contactsStatus");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error-text", Boolean(isError));
}

async function loadSavedContacts() {
  const adminKey = $("sendKey").value.trim();

  if (!adminKey) {
    setContactsStatus("Enter the private send key first.", true);
    return;
  }

  setContactsStatus("Loading saved contacts...");

  try {
    const response = await fetch(LIST_CONTACTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Could not load contacts.");
    }

    const contacts = Array.isArray(result.contacts) ? result.contacts : [];
    const emails = contacts.map((contact) => contact.email).filter(Boolean);

    mergeRecipients(emails);
    renderContacts(contacts);
    setContactsStatus(`Loaded ${emails.length} saved contact(s).`);
  } catch (error) {
    console.error(error);
    setContactsStatus(error.message || "Could not load contacts.", true);
  }
}

function renderContacts(contacts) {
  const list = $("contactsList");
  if (!list) return;

  list.innerHTML = contacts.slice(0, 120).map((contact) => {
    const label = contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email;
    const meta = [contact.source, contact.status, contact.plan].filter(Boolean).join(" · ");
    return `<button type="button" class="contact-chip" data-contact-email="${contact.email}">
      <strong>${label}</strong>
      <span>${contact.email}</span>
      ${meta ? `<em>${meta}</em>` : ""}
    </button>`;
  }).join("");

  list.querySelectorAll("[data-contact-email]").forEach((button) => {
    button.addEventListener("click", () => {
      mergeRecipients([button.dataset.contactEmail]);
      setContactsStatus(`Added ${button.dataset.contactEmail}`);
    });
  });
}

async function sendEmail(testOnly) {
  const adminKey = $("sendKey").value.trim();
  const recipients = parseRecipients($("recipients").value);
  const subject = $("subject").value.trim();
  const message = $("message").value.trim();

  if (!SEND_ENDPOINT || SEND_ENDPOINT.includes("PASTE_")) {
    setStatus("Function URL is not set yet in js/communications.js.", true);
    return;
  }

  if (!adminKey) {
    setStatus("Enter the private send key first.", true);
    return;
  }

  if (!recipients.length) {
    setStatus("Add at least one recipient.", true);
    return;
  }

  if (!subject || !message) {
    setStatus("Subject and message are required.", true);
    return;
  }

  const to = testOnly ? [recipients[0]] : recipients;

  setStatus(`Sending ${testOnly ? "test email" : "email"} to ${to.length} recipient(s)...`);

  try {
    const response = await fetch(SEND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey, to, subject, text: message })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Email send failed.");
    }

    setStatus(`Sent successfully to ${result.sent || to.length} recipient(s).`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Email send failed.", true);
  }
}
