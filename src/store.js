import {
  doc, collection, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc,
  addDoc, query, orderBy, getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

// Family doc stores: { members: [email1, email2, ...], children: [...] }
// Sub-collections: competitions, history

export function familyRef(familyId) {
  return doc(db, "families", familyId);
}

// Listen to family doc (children list, members)
export function onFamilyData(familyId, callback) {
  return onSnapshot(doc(db, "families", familyId), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

// Listen to competitions
export function onCompetitions(familyId, callback) {
  const q = query(collection(db, "families", familyId, "competitions"), orderBy("date", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// Listen to history
export function onHistory(familyId, callback) {
  const q = query(collection(db, "families", familyId, "history"), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// Create or join family
export async function createFamily(familyId, email) {
  const ref = doc(db, "families", familyId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // Add member if not already
    const data = snap.data();
    if (!data.members.includes(email)) {
      await updateDoc(ref, { members: [...data.members, email] });
    }
  } else {
    await setDoc(ref, { members: [email], children: [], checked: {} });
  }
}

// Update family doc (children, checked items)
export async function updateFamily(familyId, updates) {
  await updateDoc(doc(db, "families", familyId), updates);
}

// Competitions CRUD
export async function addCompetition(familyId, comp) {
  await addDoc(collection(db, "families", familyId, "competitions"), comp);
}

export async function updateCompetition(familyId, compId, comp) {
  const { id, ...data } = comp;
  await setDoc(doc(db, "families", familyId, "competitions", compId), data);
}

export async function deleteCompetition(familyId, compId) {
  await deleteDoc(doc(db, "families", familyId, "competitions", compId));
}

// History CRUD
export async function addHistory(familyId, entry) {
  await addDoc(collection(db, "families", familyId, "history"), entry);
}

export async function updateHistoryEntry(familyId, entryId, entry) {
  const { id, ...data } = entry;
  await setDoc(doc(db, "families", familyId, "history", entryId), data);
}

export async function deleteHistoryEntry(familyId, entryId) {
  await deleteDoc(doc(db, "families", familyId, "history", entryId));
}
