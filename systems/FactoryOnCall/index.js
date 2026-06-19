/*
 Run this with Node:
    node index.js

 Seeds Factory On Call demo company using Firebase Admin.
*/

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

const COMPANY_ID = "demo-company";

async function seed() {
  console.log(`🚀 Seeding Factory On Call company: ${COMPANY_ID}`);

  const companyRef = db.collection("companies").doc(COMPANY_ID);

  await companyRef.set({
    companyId: COMPANY_ID,
    companyName: "Factory On Call Demo",
    mode: "demo",
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  await companyRef.collection("settings").doc("main").set({
    autoRefreshMinutes: 60,
    allowSharedStations: true,
    requirePinForCalls: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  await companyRef.collection("branding").doc("main").set({
    companyName: "Factory On Call Demo",
    primaryColor: "#1E90FF",
    secondaryColor: "#003366",
    logoUrl: "",
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  const roles = [
    "Maintenance",
    "Quality",
    "Supervisor",
    "Material Handler",
    "Team Lead",
    "Production Support"
  ];

  for (const role of roles) {
    await companyRef.collection("roles").doc(role).set({
      name: role,
      active: true,
      createdAt: FieldValue.serverTimestamp()
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
    await companyRef.collection("users").doc(user.id).set({
      employeeNumber: user.id,
      pin: user.pin,
      name: user.name,
      role: user.role,
      active: true,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  const stations = [
    "Press 1",
    "Press 2",
    "Assembly 1",
    "Assembly 2",
    "Packaging",
    "Receiving"
  ];

  for (const station of stations) {
    const stationId = station.toLowerCase().replaceAll(" ", "-");
    await companyRef.collection("stations").doc(stationId).set({
      name: station,
      active: true,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await companyRef.collection("calls").doc("_seed_marker").set({
    marker: true,
    createdAt: FieldValue.serverTimestamp(),
    note: "Keeps calls collection initialized."
  }, { merge: true });

  await companyRef.collection("activity").doc("_seed_marker").set({
    marker: true,
    createdAt: FieldValue.serverTimestamp(),
    note: "Keeps activity collection initialized."
  }, { merge: true });

  console.log("✅ DONE — Factory On Call demo company seeded.");
}

seed().catch((error) => {
  console.error("❌ Seeder failed:", error);
  process.exit(1);
});