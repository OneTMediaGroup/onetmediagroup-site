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
    { id: "1001", pin: "1111", name: "Jake", role: "Maintenance" },
    { id: "1002", pin: "2222", name: "A. Patel", role: "Quality" },
    { id: "1003", pin: "3333", name: "J. Smith", role: "Supervisor" },
    { id: "1004", pin: "4444", name: "Maria", role: "Material Handler" },
    { id: "1005", pin: "5555", name: "Lee", role: "Team Lead" }
  ];

  for (const user of users) {
    await setDoc(doc(db, "companies", COMPANY_ID, "users", user.id), {
      employeeNumber: user.id,
      pin: user.pin,
      name: user.name,
      role: user.role,
      active: true,
      createdAt: serverTimestamp()
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

    await setDoc(doc(db, "companies", COMPANY_ID, "stations", stationId), {
      stationId,
      name: station,
      active: true,
      createdAt: serverTimestamp()
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