// Offline / Weak WiFi Resilience

const existingBanner = document.querySelector('.connection-banner');
const banner = existingBanner || document.createElement('div');

banner.className = `connection-banner ${navigator.onLine ? 'online' : 'offline'}`;
banner.textContent = navigator.onLine ? 'Online' : 'Offline Mode';

if (!existingBanner) {
  document.body.prepend(banner);
}

function updateConnectionBanner() {
  if (navigator.onLine) {
    banner.className = 'connection-banner online';
    banner.textContent = 'Online';
  } else {
    banner.className = 'connection-banner offline';
    banner.textContent = 'Offline Mode';
  }
}

window.addEventListener('online', updateConnectionBanner);
window.addEventListener('offline', updateConnectionBanner);
updateConnectionBanner();

document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-prevent-double]');
  if (!button) return;

  if (button.dataset.pending === 'true') {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  button.dataset.pending = 'true';
  button.disabled = true;

  window.setTimeout(() => {
    button.dataset.pending = 'false';
    button.disabled = false;
  }, 2500);
});

window.floorFlowCache = window.floorFlowCache || {
  save(key, value) {
    localStorage.setItem(key, JSON.stringify({
      value,
      updatedAt: Date.now()
    }));
  },

  load(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw).value;
    } catch {
      return null;
    }
  }
};
