'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import type { Reminder } from '@/lib/firebase/firestore';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { BellRing } from 'lucide-react';

export function ReminderNotificationHandler() {
  const { user } = useUser();
  const firestore = useFirestore();
  const remindersQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'reminders') : null
  , [user, firestore]);
  const { data: reminders } = useCollection<Reminder>(remindersQuery);
  const [dueReminder, setDueReminder] = useState<Reminder | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // This effect runs only on the client
    setAudio(new Audio('/beep.mp3'));
  }, []);

  useEffect(() => {
    if (!reminders || reminders.length === 0) {
      return;
    }

    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      for (const reminder of reminders) {
        if (reminder.time === currentTime) {
          setDueReminder(reminder);
          break; // Show one reminder at a time
        }
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkReminders, 30000);
    // Also check immediately on load
    checkReminders(); 

    return () => clearInterval(interval);
  }, [reminders]);

  useEffect(() => {
    if (dueReminder && audio) {
      audio.play().catch(e => console.error("Audio playback failed:", e));
    }
  }, [dueReminder, audio]);

  const handleDismiss = async () => {
    if (!dueReminder || !user) return;
    
    // Optimistically close dialog
    const dismissedReminder = dueReminder;
    setDueReminder(null);

    // Stop audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Delete from Firestore
    try {
        if (dismissedReminder.id) {
            const reminderRef = doc(firestore, 'users', user.uid, 'reminders', dismissedReminder.id);
            await deleteDoc(reminderRef);
        }
    } catch (error) {
        console.error("Failed to delete reminder:", error);
        // Optional: handle error, e.g., show a toast
    }
  };

  return (
    <AlertDialog open={!!dueReminder}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <BellRing className="w-16 h-16 text-primary animate-pulse" />
          </div>
          <AlertDialogTitle className="text-center text-2xl font-bold">Medication Reminder!</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg">
            It's time to take your medication.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4 bg-secondary p-4 rounded-lg text-center">
            <p className="text-lg font-semibold">{dueReminder?.medicineName}</p>
            <p className="text-xl font-bold text-primary">Take: {dueReminder?.quantity}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDismiss} className="w-full">
            Acknowledge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
