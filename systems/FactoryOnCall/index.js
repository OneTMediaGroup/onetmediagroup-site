/*
 Run this with Node:
    node index.js

 Seeds Factory On Call demo company using temporary open Firestore rules.
*/

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
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

async function seed() {
  console.log(`🚀 Seeding Factory On Call company: ${COMPANY_ID}`);

  await setDoc(doc(db, "companies", COMPANY_ID), {
    companyId: COMPANY_ID,
    companyName: "Factory On Call Demo",
    mode: "demo",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", COMPANY_ID, "settings", "main"), {
    autoRefreshMinutes: 60,
    allowSharedStations: true,
    requirePinForCalls: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", COMPANY_ID, "branding", "main"), {
    companyName: "Factory On Call Demo",
    primaryColor: "#1E90FF",
    secondaryColor: "#003366",
    logoUrl: "",
    updatedAt: serverTimestamp()
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
    await setDoc(doc(db, "companies", COMPANY_ID, "roles", role), {
      name: role,
      active: true,
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  const users = [
    { id: "1001", pin: "1111", firstName: "Jake", lastName: "Miller", role: "Maintenance", dept: "Production" },
    { id: "1002", pin: "2222", firstName: "A.", lastName: "Patel", role: "Quality", dept: "Quality" },
    { id: "1003", pin: "3333", firstName: "J.", lastName: "Smith", role: "Supervisor", dept: "Production" },
    { id: "1004", pin: "4444", firstName: "Maria", lastName: "Rossi", role: "Material Handler", dept: "Materials" },
    { id: "1005", pin: "5555", firstName: "Lee", lastName: "Chen", role: "Team Lead", dept: "Production" }
  ];

  for (const user of users) {
    await setDoc(doc(db, "companies", COMPANY_ID, "users", user.id), {
      companyId: COMPANY_ID,
      uid: user.id,
      employeeNumber: user.id,
      pin: user.pin,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      dept: user.dept,
      email: "",
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const stations = [
    { name: "Press 1", description: "Production", cells: ["Cell 1", "Cell 2"] },
    { name: "Press 2", description: "Production", cells: ["Cell 3", "Cell 4"] },
    { name: "Assembly 1", description: "Assembly", cells: ["Assembly A"] },
    { name: "Assembly 2", description: "Assembly", cells: ["Assembly B"] },
    { name: "Packaging", description: "Packaging", cells: ["Pack Line"] },
    { name: "Receiving", description: "Materials", cells: ["Dock"] }
  ];

  for (const station of stations) {
    const stationId = station.name.toLowerCase().replaceAll(" ", "-");

    await setDoc(doc(db, "companies", COMPANY_ID, "stations", stationId), {
      stationId,
      name: station.name,
      description: station.description,
      cells: station.cells,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  await setDoc(doc(db, "companies", COMPANY_ID, "calls", "_seed_marker"), {
    marker: true,
    createdAt: serverTimestamp(),
    note: "Keeps calls collection initialized."
  }, { merge: true });

  await setDoc(doc(db, "companies", COMPANY_ID, "activity", "_seed_marker"), {
    marker: true,
    createdAt: serverTimestamp(),
    note: "Keeps activity collection initialized."
  }, { merge: true });

  console.log("✅ DONE — Factory On Call demo company seeded.");
}

seed().catch((error) => {
  console.error("❌ Seeder failed:", error);
  process.exit(1);
});