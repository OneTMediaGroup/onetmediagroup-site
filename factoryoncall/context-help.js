/* Contextual help is presentation-only: no application state or network access. */
(() => {
  'use strict';
  const help = {
    dashboard: ['Dashboard', 'Review today’s call activity, active requests, and recent updates for this plant. Open Call Logs for individual records or Analytics for trends.'],
    logs: ['Call Logs', 'Review call records and use the available filters to narrow the list. Export CSV when you need a copy for reporting. Acknowledged means someone has responded; closed means the request has been completed.'],
    areas: ['Areas', 'Organize your plant into areas such as Assembly, Packaging, or Receiving. Assign stations to their area to make calls easier to locate and reports easier to understand.'],
    stations: ['Stations', 'Create the stations and work cells where operators request support. Give each a recognizable name and assign its area. Use your plant’s Station link to open a call screen.'],
    roles: ['Roles', 'Create roles that match your support teams, such as Maintenance or Quality. Call Access controls what users can request; Response Access controls which calls they can handle. Assign roles on the Users page. The system Admin role is protected.'],
    users: ['Users', 'Add people who use the system and assign the appropriate roles and permissions. Users sign in with their User ID and PIN. Share credentials only with the intended user.'],
    billing: ['Billing', 'Review this plant’s subscription and billing status. Use the billing portal to manage the available payment and subscription options. Demo plants and paid Production plants have different billing arrangements.'],
    branding: ['Branding', 'Set the company name and logo used across your plant screens. Preview the result on the Station, Supervisor, Viewer, and Production Display after saving.'],
    settings: ['Plant Access', 'Use these links to open this plant’s Admin, Station, Supervisor, and Display screens on the appropriate devices. Keep each device on the correct plant link, especially when switching between Demo and Production.'],
    emergency: ['Emergency Alerts', 'Enable the optional plant-wide alert, set its message, and choose whether live screens play a sound. Clear an active alert only when appropriate under your plant’s procedures.', 'This is an awareness tool. It does not replace required safety systems, emergency services, or your plant’s emergency procedures. Sound also depends on the device and browser settings.'],
    analytics: ['Analytics', 'Choose a date range to review call activity, busy work cells, area totals, and demand trends. Wait time measures the time to acknowledgement; closure time measures the time to completion. Calls without the timestamps needed for a metric may be excluded.', 'Emergency History summarizes alerts separately. Use the available CSV exports for further reporting.'],
    call: ['Call Station', 'Check that you are in the correct plant and station. Sign in when prompted, select the role you need, then send the call. Watch the call status for acknowledgement and completion.', 'If an Emergency button is enabled, follow your plant’s emergency procedures. The alert is an additional awareness tool.'],
    supervisor: ['Supervisor Portal', 'Review waiting and acknowledged calls, identify the station needing help, and use the actions available to your role. Acknowledge a call when responding and close it when the request is complete.'],
    viewer: ['Interactive Viewer', 'Use this shared screen to review live calls across the plant. Available call actions depend on your sign-in and permissions. Check the connection status if updates appear to stop.'],
    display: ['Production Display', 'Keep this screen open on a plant TV or shared monitor to show live calls. Use Full Screen for a larger view. Check the connection status if updates appear to stop. Alert sounds depend on browser and device settings.'],
    onboarding: ['Create a Plant', 'Choose Demo to explore a plant with sample areas, stations, roles, and users. Choose Production for your facility and complete secure checkout. Production starts with an Admin role and user so you can add your own plant setup.', 'Save the Plant Code, Administrator User ID, and PIN shown when onboarding finishes.']
  };
  const page = location.pathname.split('/').pop().replace(/\.html$/, '');
  const selectors = {admin: '#pageTitle', call: '.app-title', supervisor: '.ph-subtitle', viewer: '.section-title', display: '.section-title', onboarding: 'h1'};
  const target = document.querySelector(selectors[page] || '[data-foc-help]');
  if (!target) return;
  const currentKey = () => page === 'admin' ? (document.querySelector('.nav-item.active[data-tab]')?.dataset.tab || 'dashboard') : page;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'foc-help-button';
  button.textContent = 'ⓘ';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'foc-help-dialog');
  const updateLabel = () => {
    const title = (help[currentKey()] || help.dashboard)[0];
    button.setAttribute('aria-label', `About ${title}`);
    button.title = `About ${title}`;
  };
  updateLabel();
  target.insertAdjacentElement('afterend', button);
  target.classList.add('foc-help-heading');
  const dialog = document.createElement('dialog');
  dialog.id = 'foc-help-dialog';
  dialog.className = 'foc-help-dialog';
  dialog.setAttribute('aria-labelledby', 'foc-help-title');
  const title = document.createElement('h2');
  title.id = 'foc-help-title';
  const body = document.createElement('div');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'foc-help-close';
  close.textContent = 'Close';
  dialog.append(title, body, close);
  document.body.append(dialog);
  button.addEventListener('click', () => {
    if (document.body.classList.contains('emergency-active')) return;
    const content = help[currentKey()] || help.dashboard;
    title.textContent = `About ${content[0]}`;
    body.replaceChildren(...content.slice(1).map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    dialog.showModal();
    close.focus();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (!document.body.classList.contains('emergency-active')) button.focus();
  });
  new MutationObserver(() => {
    if (document.body.classList.contains('emergency-active') && dialog.open) dialog.close();
  }).observe(document.body, {attributes: true, attributeFilter: ['class']});
  if (page === 'admin') {
    const nav = document.querySelector('.nav-item[data-tab]')?.parentElement?.parentElement;
    if (nav) new MutationObserver(updateLabel).observe(nav, {subtree: true, attributes: true, attributeFilter: ['class']});
  }
})();
