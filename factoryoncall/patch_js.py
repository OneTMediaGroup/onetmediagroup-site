from pathlib import Path
root=Path('/mnt/data/foc')
# Admin JS patches
p=root/'admin.js'
s=p.read_text()
s=s.replace('const callsRef = companyRef.collection("calls");\n  const activityRef = companyRef.collection("activity");', 'const callsRef = companyRef.collection("calls");\n  const activityRef = companyRef.collection("activity");\n  const emergencyEventsRef = companyRef.collection("emergencyEvents");')
s=s.replace('const analyticsLongestResolutionList = document.getElementById("analyticsLongestResolutionList");', 'const analyticsLongestResolutionList = document.getElementById("analyticsLongestResolutionList");\n  const analyticsEmergencyCount = document.getElementById("analyticsEmergencyCount");\n  const analyticsEmergencyAvgDuration = document.getElementById("analyticsEmergencyAvgDuration");\n  const analyticsEmergencyLongest = document.getElementById("analyticsEmergencyLongest");\n  const analyticsEmergencyTopStation = document.getElementById("analyticsEmergencyTopStation");\n  const analyticsEmergencyHistoryList = document.getElementById("analyticsEmergencyHistoryList");')
s=s.replace('let cachedCalls = [];\n  let currentEmergencyActive = false;', 'let cachedCalls = [];\n  let cachedEmergencyEvents = [];\n  let currentEmergencyActive = false;')
# Insert helper functions before renderAnalytics
helper=r'''
  function emergencyEventStartMillis(event = {}) {
    return normalizeMillis(event.activatedAt || event.startedAt || event.createdAt || event.timeStarted || event.updatedAt);
  }

  function emergencyEventEndMillis(event = {}) {
    return normalizeMillis(event.clearedAt || event.endedAt || event.resolvedAt || event.updatedAt);
  }

  function emergencyInAnalyticsRange(event = {}) {
    const start = emergencyEventStartMillis(event);
    if (!start) return false;
    const bounds = analyticsRangeBounds();
    return start >= bounds.start && start <= bounds.end;
  }

  function renderEmergencyAnalytics() {
    const events = cachedEmergencyEvents
      .filter(emergencyInAnalyticsRange)
      .sort((a, b) => (emergencyEventStartMillis(b) || 0) - (emergencyEventStartMillis(a) || 0));

    const stationCounts = new Map();
    const durations = [];
    const historyItems = [];

    events.forEach(event => {
      const station = event.activatedByStation || event.station || event.location || "Plant-wide";
      incrementMap(stationCounts, station);
      const start = emergencyEventStartMillis(event);
      const end = emergencyEventEndMillis(event);
      const duration = end && start && end >= start ? Math.max(1, Math.round((end - start) / 60000)) : null;
      if (duration) durations.push(duration);
      historyItems.push({
        minutes: duration || 0,
        title: station,
        subtitle: `${event.activatedBy || event.requestedBy || "Station"} → ${event.clearedBy || (event.active ? "Active" : "Not recorded")}`,
        value: duration ? formatDurationMinutes(duration) : (event.active ? "Active" : "—")
      });
    });

    const topStation = sortedMapEntries(stationCounts)[0];
    if (analyticsEmergencyCount) analyticsEmergencyCount.textContent = String(events.length);
    if (analyticsEmergencyAvgDuration) analyticsEmergencyAvgDuration.textContent = formatDurationMinutes(average(durations));
    if (analyticsEmergencyLongest) analyticsEmergencyLongest.textContent = formatDurationMinutes(durations.length ? Math.max(...durations) : null);
    if (analyticsEmergencyTopStation) analyticsEmergencyTopStation.textContent = topStation ? topStation[0] : "—";
    renderDetailList(analyticsEmergencyHistoryList, historyItems, "No emergency alerts in this range.");
  }

'''
if 'function renderEmergencyAnalytics()' not in s:
    s=s.replace('  function renderAnalytics() {', helper+'  function renderAnalytics() {')
s=s.replace('renderRankList(analyticsHourList, hourEntries, { suffix: "calls", max: maxMapValue(byHour), limit: 12 });\n  }', 'renderRankList(analyticsHourList, hourEntries, { suffix: "calls", max: maxMapValue(byHour), limit: 12 });\n    renderEmergencyAnalytics();\n  }')
# Listener insert after calls listener
listener=r'''

      emergencyEventsRef.onSnapshot(
        snapshot => {
          cachedEmergencyEvents = snapshot.docs
            .filter(doc => doc.id !== "_seed_marker")
            .map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
          renderAnalytics();
        },
        err => {
          console.warn("Emergency history listener unavailable:", err);
        }
      );
'''
if 'emergencyEventsRef.onSnapshot' not in s:
    s=s.replace('      callsRef.onSnapshot(\n        snapshot => {', listener+'\n      callsRef.onSnapshot(\n        snapshot => {')
# Admin clear update event
s=s.replace('await emergencyRef.set({\n            active: false,\n            clearedBy: "Admin",\n            clearedAt: Date.now(),\n            updatedAt: Date.now()\n          }, { merge: true });', 'const emergencySnap = await emergencyRef.get();\n          const emergencyData = emergencySnap.exists ? (emergencySnap.data() || {}) : {};\n          const now = Date.now();\n          await emergencyRef.set({\n            active: false,\n            clearedBy: "Admin",\n            clearedAt: now,\n            updatedAt: now\n          }, { merge: true });\n          await updateEmergencyEventClear(emergencyData, "Admin", "", now);')
# Add updateEmergencyEventClear near apply settings if missing
fn=r'''

  async function updateEmergencyEventClear(emergencyData = {}, clearedBy = "", clearedByUid = "", clearedAt = Date.now()) {
    try {
      const eventId = emergencyData.eventId || "";
      if (eventId) {
        await emergencyEventsRef.doc(eventId).set({ active: false, clearedBy, clearedByUid, clearedAt, updatedAt: clearedAt }, { merge: true });
        return;
      }
      const snap = await emergencyEventsRef.where("active", "==", true).limit(1).get();
      const batch = db.batch();
      snap.docs.forEach(doc => batch.set(doc.ref, { active: false, clearedBy, clearedByUid, clearedAt, updatedAt: clearedAt }, { merge: true }));
      if (!snap.empty) await batch.commit();
    } catch (err) {
      console.warn("Could not update emergency history event:", err);
    }
  }
'''
if 'async function updateEmergencyEventClear' not in s:
    s=s.replace('  function setAdminEmergencyHeader(active) {', fn+'\n  function setAdminEmergencyHeader(active) {')
p.write_text(s)

# call.js event create/update
p=root/'call.js'
s=p.read_text()
old='''        await emergencyRef.set({
          enabled: true,
          active: true,
          message: emergencySettings.message || "Plant Emergency — follow company emergency procedures.",
          soundEnabled: emergencySettings.soundEnabled !== false,
          activatedByStation: STATION_NAME,
          activatedAt: Date.now(),
          updatedAt: Date.now()
        }, { merge: true });'''
new='''        const now = Date.now();
        const eventDoc = companyRef.collection("emergencyEvents").doc();
        await eventDoc.set({
          active: true,
          activatedByStation: STATION_NAME,
          station: STATION_NAME,
          activatedBy: "Station",
          activatedAt: now,
          message: emergencySettings.message || "Plant Emergency — follow company emergency procedures.",
          createdAt: now,
          updatedAt: now
        });
        await emergencyRef.set({
          enabled: true,
          active: true,
          eventId: eventDoc.id,
          message: emergencySettings.message || "Plant Emergency — follow company emergency procedures.",
          soundEnabled: emergencySettings.soundEnabled !== false,
          activatedByStation: STATION_NAME,
          activatedAt: now,
          updatedAt: now
        }, { merge: true });'''
s=s.replace(old,new)
# Add helper before clearEmergencyFromStation
fn=r'''
  async function updateEmergencyEventClear(clearedBy, clearedByUid, clearedAt) {
    try {
      const eventId = emergencySettings.eventId || "";
      if (eventId) {
        await companyRef.collection("emergencyEvents").doc(eventId).set({ active: false, clearedBy, clearedByUid, clearedAt, updatedAt: clearedAt }, { merge: true });
      }
    } catch (err) {
      console.warn("Could not update emergency history event:", err);
    }
  }

'''
if 'async function updateEmergencyEventClear(clearedBy' not in s:
    s=s.replace('  async function clearEmergencyFromStation(user) {', fn+'  async function clearEmergencyFromStation(user) {')
s=s.replace('''      await emergencyRef.set({
        active: false,
        clearedBy: closerName,
        clearedByUid: closerUid,
        clearedAt: now,
        updatedAt: now
      }, { merge: true });''', '''      await emergencyRef.set({
        active: false,
        clearedBy: closerName,
        clearedByUid: closerUid,
        clearedAt: now,
        updatedAt: now
      }, { merge: true });
      await updateEmergencyEventClear(closerName, closerUid, now);''')
p.write_text(s)
