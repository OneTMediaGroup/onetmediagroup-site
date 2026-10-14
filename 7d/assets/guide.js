/* Local interface preview only. No AI requests, persistence, or universe data access. */
(() => {
  'use strict';
  const script = document.currentScript;
  const assetBase = new URL('.', script.src);
  const shell = document.createElement('aside');
  shell.className = 'sevend-guide';
  shell.dataset.state = 'idle';
  shell.setAttribute('aria-label', '7D AI Guide');
  shell.innerHTML = `
    <section class="guide-panel" id="sevend-guide-panel" role="region" aria-labelledby="guide-title" hidden>
      <div class="guide-heading">
        <img class="guide-mascot" alt="" width="52" height="52">
        <div><h2 id="guide-title">7D AI Guide</h2><p>Your little universe companion</p></div>
        <button type="button" class="guide-close" aria-label="Close 7D AI Guide">×</button>
      </div>
      <div class="guide-body">
        <span class="guide-badge">INTERFACE PREVIEW · AI OFFLINE</span>
        <p>Hello, universe explorer. One day I’ll help you discover connections and revisit shared memories.</p>
        <div class="guide-message" role="status" aria-live="polite" aria-atomic="true">
          <strong class="guide-state-title"></strong><p class="guide-state-text"></p>
        </div>
        <p class="guide-field-label" id="guide-preview-label">Preview my expressions</p>
        <div class="guide-state-controls" role="group" aria-labelledby="guide-preview-label">
          <button type="button" data-preview="idle" aria-pressed="true">Idle</button>
          <button type="button" data-preview="thinking" aria-pressed="false">Thinking</button>
          <button type="button" data-preview="responding" aria-pressed="false">Responding</button>
        </div>
        <label class="guide-field-label" for="guide-question">Connection & memory search · Coming later</label>
        <div class="guide-composer"><input id="guide-question" placeholder="How do I know Sarah?" disabled aria-describedby="guide-search-note"><button type="button" disabled>Send</button></div>
        <p class="guide-note" id="guide-search-note">AI is not connected. No questions are sent and no profiles or memories are searched. Future search will require sign-in and permission checks.</p>
      </div>
      <div class="guide-footer"><a href="../ai-systems.html">One T AI Systems</a><a class="guide-theme-link">Daylight ↗</a></div>
    </section>
    <button type="button" class="guide-launcher" aria-label="Open 7D AI Guide" aria-expanded="false" aria-controls="sevend-guide-panel"><img class="guide-mascot" alt="" width="50" height="50"><span>7D Guide</span></button>`;
  document.body.append(shell);
  const launcher = shell.querySelector('.guide-launcher');
  const panel = shell.querySelector('.guide-panel');
  const close = shell.querySelector('.guide-close');
  const states = {
    idle: ['Ready to explore', 'For now, try tapping a profile in the universe. You can drag the view, zoom in, and reset it.'],
    thinking: ['Thinking · animation preview', 'This is a visual preview of my thinking state. No AI request or search is running.'],
    responding: ['Responding · sample message', '“Every connection has a story.” This is a fixed sample, not an AI answer or a result from your memories.']
  };
  function setState(state) {
    shell.dataset.state = state;
    shell.querySelector('.guide-state-title').textContent = states[state][0];
    shell.querySelector('.guide-state-text').textContent = states[state][1];
    shell.querySelectorAll('.guide-mascot').forEach(img => { img.src = new URL('guide-avatar.png', assetBase).href; });
    shell.querySelectorAll('[data-preview]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preview === state)));
  }
  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', `${open ? 'Close' : 'Open'} 7D AI Guide`);
    if (open) close.focus();
    else { setState('idle'); launcher.focus(); }
  }
  launcher.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false));
  shell.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
  });
  shell.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => setState(button.dataset.preview)));
  const daylight = document.documentElement.dataset.guideTheme === 'daylight';
  const themeLink = shell.querySelector('.guide-theme-link');
  themeLink.href = daylight ? '7degrees-concept.html' : '7degrees-light-concept.html';
  themeLink.textContent = daylight ? 'Midnight ↗' : 'Daylight ↗';
  setState('idle');
})();
