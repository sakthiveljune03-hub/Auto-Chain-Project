// scripts/seed.mjs
// Run: node scripts/seed.mjs
//
// Seeds Firestore with Tamil Nadu Premium Collection
// and cleans up old seed data to prevent duplicates.

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  query,
  where,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

// ── Paste your Firebase config here (same values as your .env) ────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyASBIO9B3MAXbJ1wrnFfHYsUZkAbs6pcMk",
  authDomain:        "autochain-new.firebaseapp.com",
  projectId:         "autochain-new",
  storageBucket:     "autochain-new.firebasestorage.app",
  messagingSenderId: "1065099386205",
  appId:             "1:1065099386205:web:0b8c1c4c649f82e8785cb4",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Seed data ─────────────────────────────────────────────────────────────────
const SELLER_ID   = "seed-seller-001";
const SELLER_NAME = "AutoChain Demo";

const cars = [
  {
    make: "Audi", model: "Q7 55 TFSI", year: 2023, color: "Mythos Black",
    vin: "WAUZZZ4M1PA001234", mileage: 2500, condition: "Excellent",
    location: "Chennai, TN",
    description: "Quattro all-wheel drive, Matrix LED headlights, Bang & Olufsen sound. Dealer maintained.",
    imageUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80",
    status: "live",
  },
  {
    make: "BMW", model: "M4 Competition", year: 2022, color: "Isle of Man Green",
    vin: "WBS12AZ50LM009876", mileage: 4200, condition: "Excellent",
    location: "Coimbatore, TN",
    description: "Carbon fiber bucket seats, M Track package, head-up display. High-performance masterpiece.",
    imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80",
    status: "live",
  },
  {
    make: "Mercedes-Maybach", model: "S-Class S580", year: 2023, color: "Obsidian Black/Silver",
    vin: "W1K2231761A000555", mileage: 1100, condition: "Mint",
    location: "Chennai, TN",
    description: "First-class rear suite, Burmester 4D surround sound, executive seats with massage.",
    imageUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
    status: "live",
  },
  {
    make: "Jaguar", model: "F-PACE SVR", year: 2022, color: "Sanguinello Orange",
    vin: "SAJAC2DV4NV000444", mileage: 5800, condition: "Great",
    location: "Coimbatore, TN",
    description: "550HP Supercharged V8. Performance seats, switchable active exhaust. TN registered.",
    imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
    status: "live",
  },
  {
    make: "Land Rover", model: "Defender 110 V8", year: 2023, color: "Carpathian Grey",
    vin: "SALYA2GU5PA000777", mileage: 3100, condition: "Excellent",
    location: "Chennai, TN",
    description: "V8 Supercharged, 22-inch wheels, quad-exit exhausts. Ultimate luxury off-roader.",
    imageUrl: "https://images.unsplash.com/photo-1616422285623-13ff0167c95c?w=800&q=80",
    status: "live",
  },
  {
    make: "Volvo", model: "XC90 Recharge", year: 2023, color: "Crystal White",
    vin: "YV4BR00L6P1000888", mileage: 1500, condition: "New",
    location: "Madurai, TN",
    description: "Plug-in hybrid, Bowers & Wilkins audio, panoramic roof. 7-seater luxury.",
    imageUrl: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80",
    status: "live",
  }
];

// Auction end times — spread over 2-7 days from now
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return Timestamp.fromDate(d);
}

const auctionMeta = [
  { startPrice: 8500000,   endDays: 2 }, 
  { startPrice: 14500000,  endDays: 3 }, 
  { startPrice: 28000000,  endDays: 4 }, 
  { startPrice: 15500000,  endDays: 5 }, 
  { startPrice: 21500000,  endDays: 6 }, 
  { startPrice: 9800000,   endDays: 7 }, 
];

// ── Write to Firestore ────────────────────────────────────────────────────────
async function seed() {
  console.log("🌱  Seeding Firestore (Tamil Nadu Collection) …\n");

  // 1. Ensure seller profile exists
  await setDoc(doc(db, "profiles", SELLER_ID), {
    uid:           SELLER_ID,
    name:          SELLER_NAME,
    email:         "demo@autochain.xyz",
    walletAddress: null,
    avatarUrl:     null,
    role:          "seller",
    totalBids:     0,
    wonAuctions:   0,
    listedCars:    cars.length,
    createdAt:     Timestamp.now(),
  }, { merge: true });

  // 2. Clear old seed data
  console.log("  🧹  Cleaning old seed data...");
  const oldAuctions = await getDocs(query(collection(db, "auctions"), where("sellerId", "==", SELLER_ID)));
  const oldCars = await getDocs(query(collection(db, "cars"), where("sellerId", "==", SELLER_ID)));
  
  for (const d of oldAuctions.docs) await deleteDoc(d.ref);
  for (const d of oldCars.docs) await deleteDoc(d.ref);
  console.log(`  ✅  Cleared ${oldAuctions.size} auctions and ${oldCars.size} cars.\n`);

  // 3. Seed new data
  for (let i = 0; i < cars.length; i++) {
    const carData = cars[i];
    const meta    = auctionMeta[i];

    // Create car document
    const carRef = await addDoc(collection(db, "cars"), {
      ...carData,
      sellerId:   SELLER_ID,
      sellerName: SELLER_NAME,
      createdAt:  Timestamp.now(),
    });
    console.log(`  ✅  Car added: ${carData.year} ${carData.make} ${carData.model} (${carData.location})`);

    // Create matching auction document
    const auctionRef = await addDoc(collection(db, "auctions"), {
      carId:              carRef.id,
      sellerId:           SELLER_ID,
      sellerName:         SELLER_NAME,
      tokenId:            null,
      startPrice:         meta.startPrice,
      currentBid:         0,
      currentBidWei:      "0",
      startTime:          Timestamp.now(),
      endTime:            daysFromNow(meta.endDays),
      status:             "live",
      totalBids:          0,
      createdAt:          Timestamp.now(),
    });
    console.log(`  🔨  Auction added: starting at ₹${meta.startPrice.toLocaleString()}\n`);
  }

  console.log("✨  Seed complete! Refresh the app to see the Tamil Nadu collection.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
