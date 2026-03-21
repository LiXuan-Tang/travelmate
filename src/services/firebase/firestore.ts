import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';

// Generic helpers

export const createDocument = async (
  collectionPath: string,
  data: DocumentData,
): Promise<string> => {
  const ref = await addDoc(collection(db, collectionPath), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const setDocument = async (
  collectionPath: string,
  docId: string,
  data: DocumentData,
): Promise<void> => {
  const ref = doc(db, collectionPath, docId);
  const { setDoc } = await import('firebase/firestore');
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

export const getDocument = async <T>(
  collectionPath: string,
  docId: string,
): Promise<T | null> => {
  const snap = await getDoc(doc(db, collectionPath, docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
};

export const getDocuments = async <T>(
  collectionPath: string,
  constraints: QueryConstraint[] = [],
): Promise<T[]> => {
  const q = query(collection(db, collectionPath), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
};

export const updateDocument = async (
  collectionPath: string,
  docId: string,
  data: Partial<DocumentData>,
): Promise<void> => {
  await updateDoc(doc(db, collectionPath, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteDocument = async (collectionPath: string, docId: string): Promise<void> => {
  await deleteDoc(doc(db, collectionPath, docId));
};

export const subscribeToCollection = <T>(
  collectionPath: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void,
) => {
  const q = query(collection(db, collectionPath), ...constraints);
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    callback(data);
  });
};

export const subscribeToDocument = <T>(
  collectionPath: string,
  docId: string,
  callback: (data: T | null) => void,
) => {
  return onSnapshot(doc(db, collectionPath, docId), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...snap.data() } as T);
    }
  });
};

// Re-export query helpers for convenience
export { where, orderBy, limit, startAfter, serverTimestamp };
export type { QueryDocumentSnapshot, DocumentData };
