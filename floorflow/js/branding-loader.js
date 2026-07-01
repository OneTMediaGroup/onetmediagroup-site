import { getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { settingsDocRef } from './firestore-paths.js';

const DEFAULT_SETTINGS = {
  brandingMode: 'text',
  brandText: 'Floor Flow',
  logoUrl: ''
};

function normalizeBranding(rawSettings = {}) {
  const nestedBranding = rawSettings.branding || {};

  const brandingMode =
    rawSettings.brandingMode ||
    nestedBranding.brandingMode ||
    nestedBranding.mode ||
    DEFAULT_SETTINGS.brandingMode;

  const brandText =
    rawSettings.brandText ||
    nestedBranding.brandText ||
    rawSettings.plantName ||
    nestedBranding.plantName ||
    DEFAULT_SETTINGS.brandText;

  const logoUrl =
    rawSettings.logoUrl ||
    nestedBranding.logoUrl ||
    DEFAULT_SETTINGS.logoUrl;

  return {
    brandingMode,
    brandText,
    logoUrl
  };
}

async function loadBrandingSettings() {
  let settings = { ...DEFAULT_SETTINGS };

  try {
    const snap = await getDoc(settingsDocRef());
    if (snap.exists()) settings = { ...settings, ...snap.data() };
  } catch (error) {
    console.error('Branding load failed:', error);
  }

  return normalizeBranding(settings);
}

function renderBrandingToPage(settings) {
  const { brandingMode, brandText, logoUrl } = normalizeBranding(settings);
  const showLogo = brandingMode === 'logo' && Boolean(logoUrl);

  document.querySelectorAll('#plantName').forEach((el) => {
    if (showLogo) {
      el.style.display = 'none';
      el.textContent = '';
    } else {
      el.style.display = 'block';
      el.textContent = brandText;
    }
  });

  // Important: target the persistent container, not only #plantLogo.
  // In text mode the loader replaces the image with text, so #plantLogo no longer exists.
  // Targeting .branding-block lets logo/text changes update without a browser refresh.
  document.querySelectorAll('.branding-block').forEach((block) => {
    if (showLogo) {
      block.innerHTML = `<img id="plantLogo" src="${escapeAttr(logoUrl)}" alt="${escapeAttr(brandText)}" />`;
    } else {
      block.innerHTML = `<div class="branding-title">${escapeHtml(brandText)}</div>`;
    }
  });

  document.querySelectorAll('.brand-logo, .admin-brand, .display-brand').forEach((el) => {
    if (showLogo) {
      el.innerHTML = `<img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(brandText)}" />`;
    } else {
      el.textContent = brandText;
    }
  });
}

async function applyBranding(overrideSettings = null) {
  const settings = overrideSettings ? normalizeBranding(overrideSettings) : await loadBrandingSettings();
  renderBrandingToPage(settings);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

applyBranding();

window.addEventListener('branding-updated', (event) => {
  applyBranding(event.detail || null);
});
