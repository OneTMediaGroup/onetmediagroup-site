const { FieldValue, Timestamp } = require('firebase-admin/firestore');
// Demo data moved unchanged from the browser; only the server may seed a plant.
'use strict';
const admin=require('firebase-admin');
const crypto=require('crypto');
const access=require('./access');
const DEFAULT_ROLES = [
  "Maintenance",
  "Quality",
  "Supervisor",
  "Material Handler",
  "Team Lead",
  "Production Support"
];

const DEFAULT_STATIONS = [
  "Press 400",
  "Press 401",
  "Assembly 1",
  "Assembly 2",
  "Packaging",
  "Receiving"
];

const DEMO_COMPANY_NAME = "Northwind Manufacturing";

const DEMO_AREAS = [
  { name: "Receiving", description: "Incoming materials and staging" },
  { name: "Press Shop", description: "Stamping and press operations" },
  { name: "Machining", description: "CNC machining cells" },
  { name: "Assembly", description: "Final and sub-assembly cells" },
  { name: "Paint", description: "Paint booth and finishing" },
  { name: "Packaging", description: "Pack lines and outbound prep" },
  { name: "Shipping", description: "Shipping dock and trailers" }
];

const DEMO_STATIONS = [
  { name: "Receiving Dock", area: "Receiving", description: "Inbound materials", cells: ["Receiving Dock"] },
  { name: "Press 100", area: "Press Shop", description: "High-volume press line", cells: ["Press 100"] },
  { name: "Press 200", area: "Press Shop", description: "Progressive die press", cells: ["Press 200"] },
  { name: "Press 300", area: "Press Shop", description: "Secondary press line", cells: ["Press 300"] },
  { name: "CNC 01", area: "Machining", description: "CNC machining center", cells: ["CNC 01"] },
  { name: "CNC 02", area: "Machining", description: "CNC machining center", cells: ["CNC 02"] },
  { name: "Cell A", area: "Assembly", description: "Sub-assembly cell", cells: ["Cell A"] },
  { name: "Cell B", area: "Assembly", description: "Final assembly cell", cells: ["Cell B"] },
  { name: "Cell C", area: "Assembly", description: "Inspection and rework cell", cells: ["Cell C"] },
  { name: "Paint Booth", area: "Paint", description: "Paint and curing area", cells: ["Paint Booth"] },
  { name: "Pack Line 1", area: "Packaging", description: "Primary packaging line", cells: ["Pack Line 1"] },
  { name: "Pack Line 2", area: "Packaging", description: "Secondary packaging line", cells: ["Pack Line 2"] },
  { name: "Shipping Dock", area: "Shipping", description: "Outbound dock", cells: ["Shipping Dock"] }
];


function safeId(value=''){return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'item';}
const createDemoPlant=access.route(async(req,res)=>{
 const input=req.body || {};
 if(typeof input.requestId!=='string'||! /^[a-f0-9]{32}$/.test(input.requestId))access.fail(400,'Invalid onboarding request.');
 if(typeof input.email!=='string'||input.email.length>254||!input.email.includes('@'))access.fail(400,'A valid email is required.');
 await access.throttle('demo:'+String(req.ip||'unknown'),10);
 const db=admin.firestore();
 const requestRef=db.collection('_demoRequests').doc(crypto.createHash('sha256').update(input.requestId).digest('hex'));
 const result=await db.runTransaction(async transaction=>{
  const existing=await transaction.get(requestRef);if(existing.exists)return existing.data().result;
  const state={type:'demo',companyName:DEMO_COMPANY_NAME,firstName:String(input.firstName||'').slice(0,100),lastName:String(input.lastName||'').slice(0,100),email:input.email,adminPin:'1000'};
  const fullName=()=>`${state.firstName} ${state.lastName}`.trim();
  const setStatus=()=>{};
  const serverTimestamp=()=>FieldValue.serverTimestamp();
  const collection=(db,name)=>db.collection(name);
  const doc=(parent,...segments)=>segments.length?db.doc(segments.join('/')):parent.doc();
  const setDoc=(ref,data,options)=>{transaction.set(ref,data,options);};
async function createCompany() {
  if (state.companyId) return;

  setStatus(state.type === "demo" ? "Creating demo plant..." : "Creating production plant...");

  const companyDocRef = doc(collection(db, "companies"));
  const companyId = companyDocRef.id;
  state.companyId = companyId;

  state.adminPin = state.type === "demo" ? "1000" : "1000";



  const companyPayload = {
    companyId,
    companyName: state.companyName,
    contactName: fullName(),
    contactEmail: state.email,
    ownerFirstName: state.firstName,
    ownerLastName: state.lastName,
    ownerEmail: state.email,
    mode: state.type,
    plan: state.type === "production" ? state.plan : "demo",
    stripeStatus: state.type === "production" ? "placeholder_active" : "not_required",
    adminUserId: state.adminPin,
    adminPin: state.adminPin,
    portalBaseUrl: "https://onetmediagroup.ca/factoryoncall/",
    welcomeEmailStatus: "pending",
    isDemo: state.type === "demo",
    adminLocked: state.type === "demo",
    active: true,
    onboardingVersion: "v2-floor-flow-style",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(companyDocRef, companyPayload, { merge: true });

  await setDoc(doc(db, "companies", companyId, "settings", "main"), {
    requirePinForCalls: true,
    allowSharedStations: true,
    autoRefreshMinutes: 60,
    demoRestrictionsEnabled: state.type === "demo",
    playNewCallSound: true,
    playAcknowledgeSound: true,
    playClosedSound: true,
    playEmergencySound: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "settings", "emergency"), {
    enabled: state.type === "demo",
    active: false,
    soundEnabled: true,
    message: "Plant Emergency — follow company emergency procedures.",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "branding", "main"), {
    companyName: state.companyName,
    primaryColor: "#1E90FF",
    secondaryColor: "#003366",
    logoUrl: "",
    theme: "light",
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (state.type === "demo") {
    for (const role of DEFAULT_ROLES) {
      await setDoc(doc(db, "companies", companyId, "roles", role), {
        name: role,
        active: true,
        permissions: {
          makeCall: true,
          viewCalls: true,
          acknowledgeCalls: role !== "Material Handler",
          closeCalls: role === "Supervisor" || role === "Maintenance" || role === "Quality"
        },
        isCallable: true,
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    for (const station of DEFAULT_STATIONS) {
      const stationId = safeId(station);
      await setDoc(doc(db, "companies", companyId, "stations", stationId), {
        stationId,
        name: station,
        description: "Production",
        cells: [station],
        active: true,
        createdAt: serverTimestamp()
      }, { merge: true });
    }
  }

  const adminUserPayload = state.type === "demo"
    ? {
        companyId,
        firstName: "Factory",
        lastName: "Administrator",
        name: "Factory Administrator",
        email: "demo@factoryoncall.local",
        uid: state.adminPin,
        employeeNumber: state.adminPin,
        pin: state.adminPin,
        role: "Supervisor",
        dept: "Administration",
        admin: true,
        active: true,
        demoUser: true,
        createdAt: serverTimestamp()
      }
    : {
        companyId,
        firstName: state.firstName,
        lastName: state.lastName,
        name: fullName(),
        email: state.email,
        uid: state.adminPin,
        employeeNumber: state.adminPin,
        pin: state.adminPin,
        role: "Admin",
        dept: "Administration",
        admin: true,
        active: true,
        createdAt: serverTimestamp()
      };

  await setDoc(doc(db, "companies", companyId, "users", state.adminPin), adminUserPayload, { merge: true });

  if (state.type === "demo") {
    await seedDemoCompany(companyId);
  }

  await setDoc(doc(db, "companies", companyId, "calls", "_seed_marker"), {
    marker: true,
    createdAt: serverTimestamp(),
    note: "Keeps calls collection initialized."
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "activity", "_seed_marker"), {
    marker: true,
    createdAt: serverTimestamp(),
    note: "Keeps activity collection initialized."
  }, { merge: true });

  setStatus("Plant created.", true);
}

async function seedDemoCompany(companyId) {
  const now = Date.now();

  await setDoc(doc(db, "companies", companyId), {
    companyName: DEMO_COMPANY_NAME,
    displayName: DEMO_COMPANY_NAME,
    mode: "demo",
    isDemo: true,
    adminLocked: true,
    demoPlantVersion: "v1-full-working-demo",
    demoResetAvailable: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "branding", "main"), {
    companyName: DEMO_COMPANY_NAME,
    primaryColor: "#1E90FF",
    secondaryColor: "#003366",
    theme: "light",
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "settings", "emergency"), {
    enabled: true,
    active: false,
    soundEnabled: true,
    message: "Plant Emergency — follow company emergency procedures.",
    demoLocked: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  for (const area of DEMO_AREAS) {
    await setDoc(doc(db, "companies", companyId, "areas", safeId(area.name)), {
      companyId,
      ...area,
      active: true,
      demoLocked: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  for (const station of DEMO_STATIONS) {
    const stationId = safeId(station.name);
    await setDoc(doc(db, "companies", companyId, "stations", stationId), {
      companyId,
      stationId,
      ...station,
      active: true,
      archived: false,
      demoLocked: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const demoUsers = [
    { id: "1001", pin: "1111", firstName: "Emma", lastName: "Turner", role: "Production Support", dept: "Assembly" },
    { id: "1002", pin: "2222", firstName: "Liam", lastName: "Brooks", role: "Production Support", dept: "Press Shop" },
    { id: "1003", pin: "3333", firstName: "Noah", lastName: "Reed", role: "Production Support", dept: "Machining" },
    { id: "1004", pin: "4444", firstName: "Olivia", lastName: "Parker", role: "Production Support", dept: "Packaging" },
    { id: "1005", pin: "5555", firstName: "Ethan", lastName: "Cole", role: "Material Handler", dept: "Materials" },
    { id: "1006", pin: "6666", firstName: "Ava", lastName: "Patel", role: "Production Support", dept: "Paint" },
    { id: "1007", pin: "7777", firstName: "Sarah", lastName: "Mitchell", role: "Supervisor", dept: "Production" },
    { id: "1008", pin: "8888", firstName: "Mike", lastName: "Anderson", role: "Supervisor", dept: "Production" },
    { id: "1009", pin: "9999", firstName: "Kevin", lastName: "Foster", role: "Maintenance", dept: "Maintenance" },
    { id: "1010", pin: "1010", firstName: "Chris", lastName: "Morgan", role: "Maintenance", dept: "Maintenance" },
    { id: "1011", pin: "1212", firstName: "Jessica", lastName: "Nguyen", role: "Quality", dept: "Quality" },
    { id: "1012", pin: "1313", firstName: "David", lastName: "Kim", role: "Production Support", dept: "Engineering" },
    { id: "1013", pin: "1414", firstName: "Rachel", lastName: "Green", role: "Supervisor", dept: "Management" }
  ];

  for (const user of demoUsers) {
    await setDoc(doc(db, "companies", companyId, "users", user.id), {
      companyId,
      ...user,
      uid: user.id,
      employeeNumber: user.id,
      badgeCode: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      admin: user.role === "Supervisor",
      active: true,
      archived: false,
      demoLocked: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const roleDocs = [
    { name: "Maintenance", close: true, any: false },
    { name: "Quality", close: true, any: false },
    { name: "Supervisor", close: true, any: true },
    { name: "Material Handler", close: false, any: false },
    { name: "Team Lead", close: true, any: true },
    { name: "Production Support", close: false, any: false }
  ];

  for (const role of roleDocs) {
    await setDoc(doc(db, "companies", companyId, "roles", role.name), {
      name: role.name,
      active: true,
      isCallable: true,
      demoLocked: true,
      permissions: {
        makeCall: true,
        viewCalls: true,
        acknowledgeCalls: true,
        closeCalls: role.close,
        respondAnyCall: role.any,
        supervisorPortal: role.any,
        clearEmergency: role.any
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const activeCalls = [
    {
      id: "demo-active-press-200-maintenance",
      station: "Press 200",
      stationName: "Press 200",
      area: "Press Shop",
      areaName: "Press Shop",
      cells: ["Press 200"],
      roles: ["Maintenance"],
      status: "waiting",
      requestedByName: "Press 200",
      callerFirst: "",
      callerLast: "",
      timeStarted: now - 11 * 60000,
      requestedAt: now - 11 * 60000,
      demoCall: true
    },
    {
      id: "demo-active-cnc-01-quality",
      station: "CNC 01",
      stationName: "CNC 01",
      area: "Machining",
      areaName: "Machining",
      cells: ["CNC 01"],
      roles: ["Quality"],
      status: "ack",
      ackBy: "Jessica Nguyen",
      acknowledgedByName: "Jessica Nguyen",
      requestedByName: "CNC 01",
      callerFirst: "",
      callerLast: "",
      timeStarted: now - 23 * 60000,
      requestedAt: now - 23 * 60000,
      ackAt: now - 17 * 60000,
      timeAcknowledged: now - 17 * 60000,
      demoCall: true
    }
  ];

  for (const call of activeCalls) {
    const { id, ...payload } = call;
    await setDoc(doc(db, "companies", companyId, "calls", id), {
      companyId,
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const callTypes = [
    { roles: ["Maintenance"], notes: "Cleared jam and restarted line." },
    { roles: ["Quality"], notes: "Quality check completed and approved." },
    { roles: ["Material Handler"], notes: "Material delivered to station." },
    { roles: ["Supervisor"], notes: "Supervisor review completed." },
    { roles: ["Team Lead"], notes: "Team lead assisted with setup." },
    { roles: ["Production Support"], notes: "Production support completed request." }
  ];
  const stations = DEMO_STATIONS;
  const responders = ["Sarah Mitchell", "Mike Anderson", "Kevin Foster", "Chris Morgan", "Jessica Nguyen", "Rachel Green"];

  for (let i = 0; i < 54; i++) {
    const station = stations[i % stations.length];
    const type = callTypes[i % callTypes.length];
    const start = now - ((i + 3) * 2.7 * 60 * 60000) - ((i % 5) * 11 * 60000);
    const ackDelay = 2 + (i % 9);
    const clearDelay = 7 + (i % 18);
    const ack = start + ackDelay * 60000;
    const closed = ack + clearDelay * 60000;
    const responder = responders[i % responders.length];

    await setDoc(doc(db, "companies", companyId, "calls", `demo-history-${String(i + 1).padStart(2, "0")}`), {
      companyId,
      station: station.name,
      stationName: station.name,
      area: station.area,
      areaName: station.area,
      cells: station.cells,
      roles: type.roles,
      status: "closed",
      requestedByName: station.name,
      callerFirst: "",
      callerLast: "",
      ackBy: responder,
      acknowledgedByName: responder,
      closedBy: responder,
      closedByName: responder,
      resolutionSummary: type.notes,
      notes: type.notes,
      timeStarted: start,
      requestedAt: start,
      ackAt: ack,
      timeAcknowledged: ack,
      timeClosed: closed,
      closedAt: closed,
      responseMinutes: ackDelay,
      resolutionMinutes: clearDelay,
      totalDurationMinutes: ackDelay + clearDelay,
      demoCall: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const emergencySamples = [
    { station: "Paint Booth", area: "Paint", agoHours: 16, durationSeconds: 420, clearedBy: "Sarah Mitchell" },
    { station: "Press 300", area: "Press Shop", agoHours: 52, durationSeconds: 660, clearedBy: "Mike Anderson" },
    { station: "Shipping Dock", area: "Shipping", agoHours: 106, durationSeconds: 300, clearedBy: "Rachel Green" }
  ];

  for (let i = 0; i < emergencySamples.length; i++) {
    const ev = emergencySamples[i];
    const startedAt = now - ev.agoHours * 60 * 60000;
    const clearedAt = startedAt + ev.durationSeconds * 1000;
    await setDoc(doc(db, "companies", companyId, "emergencyEvents", `demo-emergency-${i + 1}`), {
      companyId,
      stationName: ev.station,
      activatedByStation: ev.station,
      areaName: ev.area,
      area: ev.area,
      active: false,
      activatedAt: startedAt,
      startedAt,
      clearedAt,
      endedAt: clearedAt,
      clearedByName: ev.clearedBy,
      clearedBy: ev.clearedBy,
      durationSeconds: ev.durationSeconds,
      demoEvent: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

  await createCompany();
  const result={companyId:state.companyId,companyName:state.companyName,adminPin:state.adminPin};
  transaction.set(requestRef,{result,createdAt:serverTimestamp()});
  return result;
 });
 res.json(result);
});
module.exports={createDemoPlant};
