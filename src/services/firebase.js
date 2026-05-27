// src/services/firebase.js
// ─── Firebase Setup ───────────────────────────────────────────────────────────
// Replace Supabase with Firebase Firestore + Firebase Auth
// All free under Firebase Spark (free) plan:
//   • Firestore: 1 GB storage, 50k reads/day, 20k writes/day
//   • Auth: Unlimited users free
//   • Realtime: Firestore onSnapshot = live updates, no extra setup

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { placeBid as placeBidOnChain, endAuctionOnChain } from "./blockchain";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
  Timestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

// ─── Your Firebase config ─────────────────────────────────────────────────────
// Get from: Firebase Console → Project Settings → Your Apps → SDK setup
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { auth, db, storage };


// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register with email + password.
 * Also creates a Firestore profile document for the user.
 */
export async function signUp(email, password, name) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Set display name on Firebase Auth user
  await firebaseUpdateProfile(user, { displayName: name });

  // Create profile document in Firestore (replaces Supabase profiles table)
  const role = (email === "admin@autochain.xyz" || email === "sakth@admin.com") ? "admin" : "buyer";

  await setDoc(doc(db, "profiles", user.uid), {
    uid:           user.uid,
    name,
    email,
    walletAddress: null,
    avatarUrl:     null,
    role:          role,
    totalBids:     0,
    wonAuctions:   0,
    listedCars:    0,
    createdAt:     serverTimestamp(),
  });

  return user;
}

/**
 * Login with email + password
 */
export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

/**
 * Sign in with Google — opens a popup.
 * Creates a Firestore profile if this is a new user.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope("profile");
  provider.addScope("email");

  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Create a profile doc if it doesn't exist yet (new Google users)
  const profileRef = doc(db, "profiles", user.uid);
  const existing = await getDoc(profileRef);
  if (!existing.exists()) {
    await setDoc(profileRef, {
      uid:           user.uid,
      name:          user.displayName || "",
      email:         user.email || "",
      walletAddress: null,
      avatarUrl:     user.photoURL || null,
      role:          "buyer",
      totalBids:     0,
      wonAuctions:   0,
      listedCars:    0,
      createdAt:     serverTimestamp(),
    });
  }

  return user;
}

/**
 * Listen for auth state changes (replaces supabase.auth.onAuthStateChange)
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}


// ─────────────────────────────────────────────────────────────────────────────
// PROFILES  (Firestore collection: "profiles")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a user profile by UID
 */
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "profiles", uid));
  if (!snap.exists()) throw new Error("Profile not found");
  return { id: snap.id, ...snap.data() };
}

/**
 * Update the current user's profile
 */
export async function updateProfile(uid, updates) {
  await updateDoc(doc(db, "profiles", uid), updates);
  return getProfile(uid);
}

// ─────────────────────────────────────────────────────────────────────────────
// CARS  (Firestore collection: "cars")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all cars.
 * Firestore doesn't support full-text search natively —
 * for search we filter client-side (fine for small datasets)
 * or integrate Algolia/Typesense for production.
 */
export async function getCars({ status, search } = {}) {
  if (!db) {
    console.warn("Firestore not initialized");
    return [];
  }
  try {
    let q = collection(db, "cars");

    // Filter by status if provided
    if (status) {
      q = query(q, where("status", "==", status), orderBy("createdAt", "desc"));
    } else {
      q = query(q, orderBy("createdAt", "desc"));
    }

    const snap = await getDocs(q);
    let carsResult = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side search filter
    if (search) {
      const s = search.toLowerCase();
      carsResult = carsResult.filter(c =>
        `${c.make} ${c.model} ${c.year} ${c.color}`.toLowerCase().includes(s)
      );
    }

    return carsResult;
  } catch (error) {
    console.error("getCars error:", error);
    return [];
  }
}

/**
 * Fetch a single car by Firestore document ID
 */
export async function getCarById(id) {
  if (!db) throw new Error("Firestore not initialized");
  try {
    const snap = await getDoc(doc(db, "cars", id));
    if (!snap.exists()) throw new Error("Car not found");
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error("getCarById error:", error);
    throw error;
  }
}

/**
 * Create a new car listing
 */
export async function createCar(carData) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to list a car");

  const docRef = await addDoc(collection(db, "cars"), {
    ...carData,
    sellerId:  user.uid,
    sellerName: user.displayName,
    status:    "draft",
    createdAt: serverTimestamp(),
  });

  // Increment seller's listedCars count
  await updateDoc(doc(db, "profiles", user.uid), {
    listedCars: increment(1),
  });

  return { id: docRef.id };
}

/**
 * Upload a car image to Firebase Storage
 */
export async function uploadCarImage(file, carId) {
  const path    = `cars/${carId}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return url;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUCTIONS  (Firestore collection: "auctions")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all auctions with optional status filter
 */
export async function getAuctions({ status } = {}) {
  if (!db) {
    console.warn("Firestore not initialized");
    return [];
  }
  try {
    let q = status
      ? query(collection(db, "auctions"), where("status", "==", status), orderBy("endTime", "asc"))
      : query(collection(db, "auctions"), orderBy("endTime", "asc"));

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("getAuctions error:", error);
    return [];
  }
}

/**
 * Fetch a single auction with its bid history
 */
export async function getAuctionById(id) {
  const [auctionSnap, bidsSnap] = await Promise.all([
    getDoc(doc(db, "auctions", id)),
    getDocs(
      query(
        collection(db, "bids"),
        where("auctionId", "==", id),
        orderBy("createdAt", "desc"),
        limit(20)
      )
    ),
  ]);

  if (!auctionSnap.exists()) throw new Error("Auction not found");

  const bids = bidsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { id: auctionSnap.id, ...auctionSnap.data(), bids };
}

/**
 * Create an auction for a car
 */
export async function createAuction({ carId, startPrice, startPriceWei, endTime, tokenId, txHash }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");

  const auctionRef = await addDoc(collection(db, "auctions"), {
    carId,
    sellerId:       user.uid,
    sellerName:     user.displayName,
    tokenId:        tokenId || null,
    startPrice,
    startPriceWei:  startPriceWei || null,
    currentBid:     0,
    currentBidWei:  "0",
    highestBidderId:   null,
    highestBidderName: null,
    startTime:      serverTimestamp(),
    endTime:        Timestamp.fromDate(new Date(endTime)),
    status:         "live",
    txHashCreated:  txHash || null,
    totalBids:      0,
    createdAt:      serverTimestamp(),
  });

  // Update car status to live
  await updateDoc(doc(db, "cars", carId), { status: "live" });

  return { id: auctionRef.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// BIDS  (Firestore collection: "bids")
// Uses Firestore transaction for atomic, race-condition-safe bidding
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Place a bid — atomic Firestore transaction.
 * Call AFTER the on-chain Ethereum transaction is confirmed.
 *
 * Firestore transactions ensure no two bids can conflict,
 * replacing the Postgres `SELECT FOR UPDATE` approach.
 */
export async function placeBid({ auctionId, amount, amountWei, txHash, blockNumber }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to bid");

  const auctionRef = doc(db, "auctions", auctionId);

  await runTransaction(db, async (transaction) => {
    const auctionSnap = await transaction.get(auctionRef);
    if (!auctionSnap.exists()) throw new Error("Auction not found");

    const auction = auctionSnap.data();

    // Validations inside transaction (atomic)
    if (auction.status !== "live")      throw new Error("Auction is not live");
    if (auction.endTime.toDate() < new Date()) throw new Error("Auction has ended");
    if (amount <= auction.currentBid)   throw new Error(`Bid must beat ₹${auction.currentBid.toLocaleString()}`);
    if (user.uid === auction.sellerId)  throw new Error("Seller cannot bid on own auction");

    // Write the new bid document
    const bidRef = doc(collection(db, "bids"));
    transaction.set(bidRef, {
      auctionId,
      bidderId:    user.uid,
      bidderName:  user.displayName || "Anonymous",
      amount,
      amountWei,
      txHash,
      blockNumber: blockNumber || 0,
      status:      "winning",
      createdAt:   serverTimestamp(),
    });

    // Update previous winning bid to "outbid" (best effort — no strict need in Firestore)
    // Note: In production, use a Cloud Function trigger to handle this cleanly.

    // Update auction document
    transaction.update(auctionRef, {
      currentBid:        amount,
      currentBidWei:     amountWei,
      highestBidderId:   user.uid,
      highestBidderName: user.displayName || "Anonymous",
      totalBids:         increment(1),
    });
  });

  // Update bidder's totalBids count
  await updateDoc(doc(db, "profiles", user.uid), {
    totalBids: increment(1),
  });
}

/**
 * Get bid history for an auction (one-time fetch)
 */
export async function getBidHistory(auctionId, limitCount = 20) {
  const snap = await getDocs(
    query(
      collection(db, "bids"),
      where("auctionId", "==", auctionId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get all bids placed by the current user
 */
export async function getMyBids() {
  const user = auth.currentUser;
  if (!user) return [];

  const snap = await getDocs(
    query(
      collection(db, "bids"),
      where("bidderId", "==", user.uid),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME LISTENERS  (Firestore onSnapshot = free real-time updates)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to new bids on an auction in real-time.
 * Firestore sends updates instantly when any bid is added.
 *
 * Replaces: Supabase channel postgres_changes
 *
 * @param   {string}   auctionId
 * @param   {Function} onBid  Called with new bid data
 * @returns {Function} Unsubscribe — call in useEffect cleanup
 *
 * Usage:
 *   const unsub = subscribeToBids(auctionId, (bid) => setBids(prev => [bid, ...prev]));
 *   return () => unsub();
 */
export function subscribeToBids(auctionId, onBid) {
  const q = query(
    collection(db, "bids"),
    where("auctionId", "==", auctionId),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  // onSnapshot fires immediately with current data, then on every change
  const unsub = onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        onBid({ id: change.doc.id, ...change.doc.data() });
      }
    });
  });

  return unsub; // Call this to stop listening
}

/**
 * Subscribe to auction state changes (current_bid, status, highest bidder)
 *
 * Replaces: Supabase channel UPDATE on auctions table
 *
 * @param   {string}   auctionId
 * @param   {Function} onUpdate  Called with updated auction data
 * @returns {Function} Unsubscribe
 */
export function subscribeToAuction(auctionId, onUpdate) {
  const unsub = onSnapshot(doc(db, "auctions", auctionId), (snap) => {
    if (snap.exists()) onUpdate({ id: snap.id, ...snap.data() });
  });
  return unsub;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardData() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const [profileSnap, myBidsSnap, myListingsSnap] = await Promise.all([
    getDoc(doc(db, "profiles", user.uid)),

    getDocs(
      query(
        collection(db, "bids"),
        where("bidderId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(10)
      )
    ),

    getDocs(
      query(
        collection(db, "auctions"),
        where("sellerId", "==", user.uid),
        orderBy("createdAt", "desc")
      )
    ),
  ]);

  return {
    profile:    profileSnap.exists() ? { id: profileSnap.id, ...profileSnap.data() } : null,
    myBids:     myBidsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    myListings: myListingsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  };
}
// ─────────────────────────────────────────────────────────────────────────────
// SEEDING (FOR DEMO/TESTING)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const [usersSnap, auctionsSnap, bidsSnap] = await Promise.all([
    getDocs(collection(db, "profiles")),
    getDocs(collection(db, "auctions")),
    getDocs(collection(db, "bids")),
  ]);

  return {
    totalUsers: usersSnap.size,
    totalAuctions: auctionsSnap.size,
    totalBids: bidsSnap.size,
  };
}

/**
 * Seed Firestore with sample cars + auctions (Tamil Nadu Premium Collection)
 */
export async function seedSampleData() {
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

  const auctionMeta = [
    { startPrice: 8500000,   endDays: 2 }, // 85 Lakhs
    { startPrice: 14500000,  endDays: 3 }, // 1.45 Crore
    { startPrice: 28000000,  endDays: 4 }, // 2.8 Crore
    { startPrice: 15500000,  endDays: 5 }, // 1.55 Crore
    { startPrice: 21500000,  endDays: 6 }, // 2.15 Crore
    { startPrice: 9800000,   endDays: 7 }, // 98 Lakhs
  ];

  const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return Timestamp.fromDate(d);
  };

  // 1. Ensure seller profile exists
  await setDoc(doc(db, "profiles", SELLER_ID), {
    uid:           SELLER_ID,
    name:          SELLER_NAME,
    email:         "demo@autochain.xyz",
    createdAt:     serverTimestamp(),
    role:          "seller",
  }, { merge: true });

  // 2. Clear old seed data to prevent "repeated collection"
  console.log("Cleaning old seed auctions and cars...");
  const oldAuctionsSnap = await getDocs(query(collection(db, "auctions"), where("sellerId", "==", SELLER_ID)));
  const oldCarsSnap = await getDocs(query(collection(db, "cars"), where("sellerId", "==", SELLER_ID)));
  
  for (const docSnap of oldAuctionsSnap.docs) {
    await runTransaction(db, async (transaction) => {
      transaction.delete(docSnap.ref);
    });
  }
  for (const docSnap of oldCarsSnap.docs) {
    await runTransaction(db, async (transaction) => {
      transaction.delete(docSnap.ref);
    });
  }

  // 3. Seed new data
  for (let i = 0; i < cars.length; i++) {
    const carRef = await addDoc(collection(db, "cars"), {
      ...cars[i],
      sellerId: SELLER_ID,
      sellerName: SELLER_NAME,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "auctions"), {
      carId: carRef.id,
      sellerId: SELLER_ID,
      sellerName: SELLER_NAME,
      startPrice: auctionMeta[i].startPrice,
      currentBid: 0,
      currentBidWei: "0",
      startTime: serverTimestamp(),
      endTime: daysFromNow(auctionMeta[i].endDays),
      status: "live",
      totalBids: 0,
      createdAt: serverTimestamp(),
    });
    console.log(`Seeded: ${cars[i].make} ${cars[i].model} in ${cars[i].location}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MANAGEMENT (ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manually end an auction
 */
export async function endAuction(auctionId) {
  const auctionRef = doc(db, "auctions", auctionId);
  await updateDoc(auctionRef, { 
    status: "ended",
    endTime: serverTimestamp() 
  });
}

/**
 * Finalize the auction: Transfer NFT on-chain and update car owner in Firestore
 */
export async function finalizeTransfer(auctionId) {
  const auctionRef = doc(db, "auctions", auctionId);
  const auctionSnap = await getDoc(auctionRef);
  if (!auctionSnap.exists()) throw new Error("Auction not found");

  const auction = auctionSnap.data();
  if (!auction.highestBidderId) throw new Error("No winner to transfer to");

  // 1. Blockchain Transfer
  // We use the tokenId stored in the auction
  const tokenId = auction.tokenId || auction.token_id;
  let txHash = null;
  
  if (tokenId) {
    const result = await endAuctionOnChain(tokenId);
    txHash = result.txHash;
  }

  // 2. Update Firestore Car Ownership
  const carRef = doc(db, "cars", auction.carId);
  await updateDoc(carRef, {
    sellerId: auction.highestBidderId,
    sellerName: auction.highestBidderName,
    status: "owned", // New owner now has it
    lastPrice: auction.currentBid,
    updatedAt: serverTimestamp()
  });

  // 3. Update Auction status
  await updateDoc(auctionRef, {
    status: "sold",
    txHashTransfer: txHash,
    finalizedAt: serverTimestamp()
  });

  // 4. Update Winner's Profile (wonAuctions count)
  await updateDoc(doc(db, "profiles", auction.highestBidderId), {
    wonAuctions: increment(1)
  });

  return { success: true, txHash };
}

/**
 * Restart an ended auction with a new end time (in hours from now)
 */
export async function restartAuction(auctionId, hoursFromNow = 48) {
  const auctionRef = doc(db, "auctions", auctionId);
  const auctionSnap = await getDoc(auctionRef);
  if (!auctionSnap.exists()) throw new Error("Auction not found");

  const { carId } = auctionSnap.data();
  const newEndTime = new Date();
  newEndTime.setHours(newEndTime.getHours() + hoursFromNow);

  await updateDoc(auctionRef, {
    status: "live",
    endTime: Timestamp.fromDate(newEndTime),
    currentBid: 0,
    currentBidWei: "0",
    highestBidderId: null,
    highestBidderName: null,
    totalBids: 0,
  });

  // Also reset the car status to live
  if (carId) {
    await updateDoc(doc(db, "cars", carId), { status: "live" });
  }
}

/**
 * Delete an auction and its bids
 */
export async function deleteAuction(auctionId) {
  const auctionRef = doc(db, "auctions", auctionId);
  const auctionSnap = await getDoc(auctionRef);
  
  if (auctionSnap.exists()) {
    const { carId } = auctionSnap.data();
    
    // 1. Delete all bids for this auction
    const bidsSnap = await getDocs(query(collection(db, "bids"), where("auctionId", "==", auctionId)));
    for (const bidDoc of bidsSnap.docs) {
      await runTransaction(db, async (transaction) => {
        transaction.delete(bidDoc.ref);
      });
    }

    // 2. Delete the auction itself
    await runTransaction(db, async (transaction) => {
      transaction.delete(auctionRef);
    });

    // 3. Reset car status if it was live
    if (carId) {
      await updateDoc(doc(db, "cars", carId), { status: "draft" });
    }
  }
}

/**
 * Update a car listing
 */
export async function updateCar(carId, updates) {
  await updateDoc(doc(db, "cars", carId), updates);
}

/**
 * Mark auction as sold after payment
 */
export async function markAsSold(auctionId, txHash) {
  const auctionRef = doc(db, "auctions", auctionId);
  const auctionSnap = await getDoc(auctionRef);
  
  if (!auctionSnap.exists()) throw new Error("Auction not found");
  const { carId } = auctionSnap.data();

  await updateDoc(auctionRef, {
    status: "sold",
    txHashPaid: txHash,
    paidAt: serverTimestamp()
  });

  if (carId) {
    await updateDoc(doc(db, "cars", carId), { status: "sold" });
  }
}

/**
 * Delete a car listing
 */
export async function deleteCar(carId) {
  await runTransaction(db, async (transaction) => {
    transaction.delete(doc(db, "cars", carId));
  });
}
