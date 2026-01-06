import { db } from './config';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';

// Dosage
export interface Dosage {
  id?: string;
  name: string;
  time: string;
  quantity: string;
}

export const addDosage = (userId: string, dosage: Omit<Dosage, 'id'>) => {
  return addDoc(collection(db, 'users', userId, 'dosage'), { ...dosage, createdAt: serverTimestamp() });
};

export const getDosages = (userId: string): Promise<QuerySnapshot<DocumentData>> => {
  const q = query(collection(db, 'users', userId, 'dosage'), orderBy('createdAt', 'desc'));
  return getDocs(q);
};

export const updateDosage = (userId: string, dosageId: string, data: Partial<Dosage>) => {
  return updateDoc(doc(db, 'users', userId, 'dosage', dosageId), data);
};

export const deleteDosage = (userId: string, dosageId: string) => {
  return deleteDoc(doc(db, 'users', userId, 'dosage', dosageId));
};

// Reminder
export interface Reminder {
    id?: string;
    medicineName: string;
    time: string;
    type: 'Morning' | 'Afternoon' | 'Night' | 'Custom';
}

export const addReminder = (userId: string, reminder: Omit<Reminder, 'id'>) => {
    return addDoc(collection(db, 'users', userId, 'reminders'), { ...reminder, createdAt: serverTimestamp() });
};

export const getReminders = (userId: string) => {
    const q = query(collection(db, 'users', userId, 'reminders'), orderBy('time', 'asc'));
    return getDocs(q);
};

export const deleteReminder = (userId: string, reminderId: string) => {
    return deleteDoc(doc(db, 'users', userId, 'reminders', reminderId));
};

// Smart Refill
export interface RefillItem {
  id?: string;
  name: string;
  totalQuantity: number;
  remainingQuantity: number;
}

export const addRefillItem = (userId: string, item: Omit<RefillItem, 'id'>) => {
    return addDoc(collection(db, 'users', userId, 'refill'), { ...item, createdAt: serverTimestamp() });
};

export const getRefillItems = (userId:string) => {
    const q = query(collection(db, 'users', userId, 'refill'), orderBy('name', 'asc'));
    return getDocs(q);
};

export const updateRefillItem = (userId: string, itemId: string, data: Partial<RefillItem>) => {
    return updateDoc(doc(db, 'users', userId, 'refill', itemId), data);
};

export const deleteRefillItem = (userId: string, itemId: string) => {
  return deleteDoc(doc(db, 'users', userId, 'refill', itemId));
};

// Feedback
export interface Feedback {
    id?: string;
    email: string;
    message: string;
}

export const addFeedback = (userId: string, feedback: Omit<Feedback, 'id'>) => {
    return addDoc(collection(db, 'users', userId, 'feedback'), { ...feedback, createdAt: serverTimestamp() });
};
