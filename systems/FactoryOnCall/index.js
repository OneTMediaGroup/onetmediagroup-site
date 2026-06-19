/*
  Factory On Call Firestore Seeder

  Run from this folder with Node:
    node index.js

  Seeds the new company-first structure:
    companies/{companyId}
      settings/main
      branding/main
      roles/{roleId}
      users/{userId}
      stations/{stationId}
      calls/_seed_marker
      activity/_seed_marker
*/

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD5n-Ykf5LoYE_2u0pbRKfektav75GZIZE",
  authDomain: "factoryoncall.firebaseapp.com",
  projectId: "factoryoncall",
  storageBucket: "factoryoncall.firebasestorage.app",
  messagingSenderId: "586355508568",
  appId: "1:586355508568:web:40c4803ef1fd749811512d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COMPANY_ID = "demo-company";
const COMPANY_NAME = "Factory On Call Demo";

function safeId(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

async function seed() {
  const now = new Date().toISOString();

  console.log(`🚀 Seeding Factory On Call company: ${COMPANY_ID}`);

  await setDoc(doc(db, "companies", COMPANY_ID), {
    companyId: COMPANY_ID,
    companyName: COMPANY_NAME,
    name: COMPANY_NAME,
    mode: "demo",
    environment: "demo",
    isDemo: true,
    billingStatus: "demo",
    subscriptionStatus: "demo",
    productionUnlocked: false,
    paid: false,
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  await setDoc(doc(db, "companies", COMPANY_ID, "settings", "main"), {
    companyId: COMPANY_ID,
    autoRefreshMinutes: 60,
    allowSharedStations: true,
    requirePinForCalls: true,
    allowViewerClose: true,
    showClosedCallsToday: true,
    updatedAt: now
  }, { merge: true });

  await setDoc(doc(db, "companies", COMPANY_ID, "branding", "main"), {
    companyId: COMPANY_ID,
    companyName: COMPANY_NAME,
    productName: "Factory On Call",
    primaryColor: "#1E90FF",
    secondaryColor: "#003366",
    logoUrl: "",
    updatedAt: now
  }, { merge: true });

  const roles = [
    "Maintenance",
    "Quality",
    "Supervisor",
    "Material Handler",
    "Team Lead",
    "Production Support"
  ];

  for (const roleName of roles) {
    await setDoc(doc(db, "companies", COMPANY_ID, "roles", safeId(roleName)), {
      companyId: COMPANY_ID,
      name: roleName,
      roleName,
      active: true,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
  }

  const users = [
    { id: "1001", pin: "1111", name: "Jake", role: "Maintenance" },
    { id: "1002", pin: "2222", name: "A. Patel", role: "Quality" },
    { id: "1003", pin: "3333", name: "J. Smith", role: "Supervisor" },
    { id: "1004", pin: "4444", name: "Maria", role: "Material Handler" },
    { id: "1005", pin: "5555", name: "Lee", role: "Team Lead" }
  ];

  for (const user of users) {
    await setDoc(doc(db, "companies", COMPANY_ID, "users", user.id), {
      companyId: COMPANY_ID,
      employeeNumber: user.id,
      employeeId: user.id,
      pin: user.pin,
      name: user.name,
      displayName: user.name,
      role: user.role,
      active: true,
      status: "active",
      createdAt: now,
      updatedAt: now
    }, { merge: true });
  }

  const stations = [
    { id: "press-1", name: "Press 1", area: "Press Area" },
    { id: "press-2", name: "Press 2", area: "Press Area" },
    { id: "assembly-1", name: "Assembly 1", area: "Assembly" },
    { id: "assembly-2", name: "Assembly 2", area: "Assembly" },
    { id: "packaging", name: "Packaging", area: "Shipping" },
    { id: "receiving", name: "Receiving", area: "Material Flow" }
  ];

  for (let index = 0; index < stations.length; index += 1) {
    const station = stations[index];
    await setDoc(doc(db, "companies", COMPANY_ID, "stations", station.id), {
      companyId: COMPANY_ID,
      stationId: station.id,
      stationName: station.name,
      name: station.name,
      area: station.area,
      active: true,
      order: index + 1,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
  }

  await setDoc(doc(db, "companies", COMPANY_ID, "calls", "_seed_marker"), {
    companyId: COMPANY_ID,
    marker: true,
    status: "seed",
    createdAt: now,
    note: "Keeps the calls subcollection visible before live calls are created."
  }, { merge: true });

  await setDoc(doc(db, "companies", COMPANY_ID, "activity", "_seed_marker"), {
    companyId: COMPANY_ID,
    marker: true,
    type: "seed",
    createdAt: now,
    note: "Keeps the activity subcollection visible before activity is created."
  }, { merge: true });

  console.log("✅ DONE — Factory On Call demo-company seeded with company-first structure.");
}

seed().catch((error) => {
  console.error("❌ Seeder failed:", error);
  process.exit(1);
});
