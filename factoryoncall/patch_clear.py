from pathlib import Path
root=Path('/mnt/data/foc')
for name in ['supervisor.js','viewer.js']:
    p=root/name
    s=p.read_text()
    fn=r'''
  async function updateEmergencyEventClear(emergencyData = {}, clearedBy = "", clearedByUid = "", clearedAt = Date.now()) {
    try {
      const eventId = emergencyData.eventId || "";
      if (eventId) {
        await companyRef.collection("emergencyEvents").doc(eventId).set({ active: false, clearedBy, clearedByUid, clearedAt, updatedAt: clearedAt }, { merge: true });
        return;
      }
      const snap = await companyRef.collection("emergencyEvents").where("active", "==", true).limit(1).get();
      const batch = db.batch();
      snap.docs.forEach(doc => batch.set(doc.ref, { active: false, clearedBy, clearedByUid, clearedAt, updatedAt: clearedAt }, { merge: true }));
      if (!snap.empty) await batch.commit();
    } catch (err) {
      console.warn("Could not update emergency history event:", err);
    }
  }

'''
    if 'async function updateEmergencyEventClear(emergencyData' not in s:
        s=s.replace('  async function resetEmergencyStationCalls', fn+'  async function resetEmergencyStationCalls')
    if name=='supervisor.js':
        old='''        await emergencyRef.set({
          active: false,
          clearedBy: auth.userName,
          clearedByUid: auth.user.uid || auth.user.employeeNumber || auth.user.id || "",
          clearedAt: Date.now(),
          updatedAt: Date.now()
        }, { merge: true });
        await resetEmergencyStationCalls(auth, emergencyData);'''
        new='''        const now = Date.now();
        const clearedByUid = auth.user.uid || auth.user.employeeNumber || auth.user.id || "";
        await emergencyRef.set({
          active: false,
          clearedBy: auth.userName,
          clearedByUid,
          clearedAt: now,
          updatedAt: now
        }, { merge: true });
        await updateEmergencyEventClear(emergencyData, auth.userName, clearedByUid, now);
        await resetEmergencyStationCalls(auth, emergencyData);'''
        s=s.replace(old,new)
    else:
        old='''        await emergencyRef.set({ active: false, clearedBy: auth.userName, clearedByUid: auth.user.uid || auth.user.employeeNumber || auth.user.id || "", clearedAt: Date.now(), updatedAt: Date.now() }, { merge: true });
        await resetEmergencyStationCalls(auth, emergencyData);'''
        new='''        const now = Date.now();
        const clearedByUid = auth.user.uid || auth.user.employeeNumber || auth.user.id || "";
        await emergencyRef.set({ active: false, clearedBy: auth.userName, clearedByUid, clearedAt: now, updatedAt: now }, { merge: true });
        await updateEmergencyEventClear(emergencyData, auth.userName, clearedByUid, now);
        await resetEmergencyStationCalls(auth, emergencyData);'''
        s=s.replace(old,new)
    p.write_text(s)
