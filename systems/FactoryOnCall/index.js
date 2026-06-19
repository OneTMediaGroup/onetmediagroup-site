/*
 Run this with Node:
    node index.js

 This will fully seed your Firebase Firestore
 without touching ANY of your existing HTML/CSS/JS files.
*/

import { initializeApp } from "firebase/app";
import { 
    getFirestore, doc, setDoc, collection
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD5n-Ykf5LoYE_2u0pbRKfektav75GZIZE",
  authDomain: "factoryoncall.firebaseapp.com",
  projectId: "factoryoncall",
  storageBucket: "factoryoncall.firebasestorage.app",
  messagingSenderId: "586355508568",
  appId: "1:586355508568:web:40c4803ef1fd749811512d"
};

// --------------------------------------------------------
// INITIALIZE
// --------------------------------------------------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --------------------------------------------------------
// DEMO PLANT ID
// --------------------------------------------------------
const PLANT_ID = "FACTORY_ON_CALL_DEMO";

// --------------------------------------------------------
// SEEDER FUNCTION
// --------------------------------------------------------
async function seed() {
    console.log("🚀 Seeding Firestore...");

    // ROOT document
    await setDoc(doc(db, "plants", PLANT_ID), {
        seededAt: new Date().toISOString(),
        settings: {
            autoRefreshMinutes: 60,
            allowSharedStations: true
        },
        branding: {
            primaryColor: "#1E90FF",
            secondaryColor: "#003366"
        }
    });

    // --------------------------------------------------------
    // ROLES
    // --------------------------------------------------------
    const roles = [
        "Maintenance",
        "Quality",
        "Supervisor",
        "Material Handler",
        "Team Lead"
    ];

    for (const r of roles) {
        await setDoc(doc(db, "plants", PLANT_ID, "roles", r), {
            name: r,
            active: true
        });
    }

    // --------------------------------------------------------
    // AUTHORIZED USERS (ID + PIN)
    // --------------------------------------------------------
    const employees = [
        { id: "1001", pin: "1111", name: "Jake" },
        { id: "1002", pin: "2222", name: "A. Patel" },
        { id: "1003", pin: "3333", name: "J. Smith" },
        { id: "1004", pin: "4444", name: "Maria" },
        { id: "1005", pin: "5555", name: "Lee" }
    ];

    for (const emp of employees) {
        await setDoc(doc(db, "plants", PLANT_ID, "authorized_pins", emp.id), {
            pin: emp.pin,
            name: emp.name
        });
    }

    // --------------------------------------------------------
    // EMPTY ALERTS COLLECTION READY FOR LIVE USE
    // --------------------------------------------------------
    await setDoc(doc(db, "plants", PLANT_ID, "alerts", "_seed_marker"), {
        created: new Date().toISOString(),
        note: "This keeps the subcollection alive"
    });

    console.log("✅ DONE — Firestore is now fully seeded!");
}

seed();
