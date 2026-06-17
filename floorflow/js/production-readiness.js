// Production Readiness Pass

window.FloorFlowProduction = {
  validatePlantContext(currentPlantId) {
    if (!currentPlantId) {
      console.warn('Missing plant context');
      return false;
    }
    return true;
  },

  safeBranding(value, fallback = 'Floor Flow') {
    return value && String(value).trim()
      ? value
      : fallback;
  },

  safeArray(value) {
    return Array.isArray(value) ? value : [];
  }
};

// Console safety
window.addEventListener('error', (event) => {
  console.error('Runtime Error:', event.message);
});
