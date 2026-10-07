(() => {
  'use strict';
  const config = window.OneTToolsConfig || {}, storageKey = 'onet-tools-analytics-v1';
  const measurementId = /^G-[A-Z0-9]+$/.test(config.ga4MeasurementId || '') ? config.ga4MeasurementId : '';
  const publisherId = /^ca-pub-\d{16}$/.test(config.adsensePublisherId || '') ? config.adsensePublisherId : '';
  const slug = location.pathname.split('/').pop().replace(/\.html$/, '');
  const canadaBadge = document.getElementById('canadaBadge'), anthem = document.getElementById('ohCanadaAudio');
  if (canadaBadge && anthem) {
    canadaBadge.setAttribute('role', 'button'); canadaBadge.setAttribute('tabindex', '0');
    canadaBadge.setAttribute('aria-label', 'Play or pause O Canada'); canadaBadge.setAttribute('aria-pressed', 'false');
    const toggleAnthem = () => { if (anthem.paused) anthem.play().catch(() => {}); else { anthem.pause(); anthem.currentTime = 0; } };
    canadaBadge.addEventListener('click', toggleAnthem);
    canadaBadge.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleAnthem(); } });
    anthem.addEventListener('play', () => canadaBadge.setAttribute('aria-pressed', 'true'));
    for (const event of ['pause', 'ended']) anthem.addEventListener(event, () => canadaBadge.setAttribute('aria-pressed', 'false'));
  }

  let analyticsAllowed = false, analyticsLoaded = false, adsLoaded = false;
  if (slug !== 'tools') document.querySelectorAll('#status,#ready').forEach(el => { el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); });
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch (_) {}
  if (!saved || typeof saved.allowed !== 'boolean' || !Number.isFinite(saved.at) || saved.at > Date.now() || Date.now() - saved.at > 180 * 86400000) saved = null;
  function googleTag() { window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }
  function consentState(allowed) {
    return { analytics_storage: allowed ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  }
  function analytics(allowed) {
    analyticsAllowed = allowed;
    if (!measurementId) return;
    window['ga-disable-' + measurementId] = !allowed;
    if (analyticsLoaded) { googleTag('consent', 'update', consentState(allowed)); return; }
    if (!allowed) return; // Basic consent: no Google tag or requests before acceptance.
    analyticsLoaded = true;
    googleTag('consent', 'default', consentState(false));
    googleTag('consent', 'update', consentState(true));
    googleTag('js', new Date());
    googleTag('config', measurementId, {
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      // Do not send query strings, fragments, referrers, filenames or user-entered values.
      page_location: location.origin + location.pathname, page_referrer: ''
    });
    googleTag('event', 'page_view', { page_location: location.origin + location.pathname, page_referrer: '', tool_slug: slug });
    const script = document.createElement('script'); script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.append(script);
  }
  function adPlacements(allowed) {
    if (!allowed || !publisherId) return;
    if (adsLoaded) { document.querySelectorAll('[data-tools-ad]').forEach(el => { el.hidden = false; }); return; }
    const placements = [...document.querySelectorAll('[data-tools-ad]')].filter(el => /^\d+$/.test((config.adsenseSlots || {})[el.dataset.toolsAd] || ''));
    if (!placements.length) return;
    adsLoaded = true;
    for (const el of placements) {
      el.hidden = false;
      const ins = document.createElement('ins'); ins.className = 'adsbygoogle';
      ins.dataset.adClient = publisherId; ins.dataset.adSlot = config.adsenseSlots[el.dataset.toolsAd];
      ins.dataset.adFormat = 'auto'; ins.dataset.fullWidthResponsive = 'true'; el.append(ins);
    }
    const script = document.createElement('script'); script.async = true; script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + publisherId;
    script.onload = () => placements.forEach(() => { (window.adsbygoogle = window.adsbygoogle || []).push({}); });
    script.onerror = () => placements.forEach(el => { el.hidden = true; });
    document.head.append(script);
  }
  // A consent-management platform may call this after obtaining the applicable consent.
  // AdSense remains off until this separate advertising grant is supplied by the CMP.
  window.OneTToolsConsent = {
    update({ analytics: analyticsConsent = false, advertising = false } = {}) {
      analytics(Boolean(analyticsConsent));
      if (advertising) adPlacements(true);
      else if (adsLoaded) location.reload();
    }
  };
  const settings = document.querySelector('[data-tools-settings]');
  if (settings && !measurementId) { settings.textContent = 'Analytics is not active'; settings.disabled = true; }
  function prompt() {
    if (!measurementId) { if (settings) settings.textContent = 'Analytics is not active'; return; }
    document.querySelector('.tools-consent')?.remove();
    const box = document.createElement('section'); box.className = 'tools-consent'; box.setAttribute('aria-label', 'Analytics preferences');
    const p = document.createElement('p'); p.textContent = 'Allow optional Google Analytics to help us understand which tools are used? Your files, passwords and entered text are not included. You can use every tool without analytics.';
    const actions = document.createElement('div'); actions.className = 'tools-consent-actions';
    for (const [label, allowed] of [['Allow analytics', true], ['Decline analytics', false]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.onclick = () => { try { localStorage.setItem(storageKey, JSON.stringify({ allowed, at: Date.now() })); } catch (_) {} analytics(allowed); box.remove(); settings?.focus(); };
      actions.append(button);
    }
    box.append(p, actions); document.body.append(box);
  }
  settings?.addEventListener('click', prompt);
  if (saved) analytics(Boolean(saved.allowed)); else if (measurementId) prompt();
  document.addEventListener('click', event => {
    if (!analyticsAllowed || !analyticsLoaded || !event.target.closest) return;
    const control = event.target.closest('a[download],button[data-tool-action]');
    if (control) googleTag('event', control.hasAttribute('download') ? 'tool_download' : 'tool_action', { tool_slug: slug, action: control.dataset.toolAction || 'download' });
  });
  // Ad placement preview is restricted to local development; never loads Google scripts.
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && new URLSearchParams(location.search).has('previewAds')) {
    document.querySelectorAll('[data-tools-ad]').forEach(el => { el.hidden = false; const div = document.createElement('div'); div.className = 'tools-ad-preview'; div.textContent = 'Ad placement preview'; el.append(div); });
  }
})();
