import { getActivePlantId, buildRelativePlantLink } from './plant-session.js';

const plantId = getActivePlantId();

if (plantId) {
  document.querySelectorAll('a[href$=".html"], a[href*=".html?"]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('http') || href.startsWith('#')) return;

    const page = href.split('?')[0];

    if (page.endsWith('.html')) {
      link.setAttribute('href', buildRelativePlantLink(page, plantId));
    }
  });
}
