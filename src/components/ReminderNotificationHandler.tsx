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

  // Web Audio API context
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on the client after the component mounts
    // It must be created after a user interaction, but we can initialize it here.
    // Playback will be triggered by a user action (dismissing the dialog).
    // For autoplay to work, it often needs to be tied to the first user gesture on the page.
    // We will attempt to play it when the dialog appears.
    setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
  }, []);
  
  const playBeep = () => {
    if (!audioContext) return;
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
  
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
  
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Hz
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
  
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2); // Beep for 0.2 seconds
    } catch (e) {
      console.error("Audio playback failed:", e);
    }
  };


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
    let beepInterval: NodeJS.Timeout | null = null;
    if (dueReminder && audioContext) {
      // Play immediately and then every second
      playBeep();
      beepInterval = setInterval(playBeep, 1200);
    }
    
    return () => {
      if (beepInterval) {
        clearInterval(beepInterval);
      }
    }
  }, [dueReminder, audioContext]);

  const handleDismiss = async () => {
    if (!dueReminder || !user) return;
    
    // Optimistically close dialog
    const dismissedReminder = dueReminder;
    setDueReminder(null);

    // Note: Beeping stops automatically due to the useEffect cleanup

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
