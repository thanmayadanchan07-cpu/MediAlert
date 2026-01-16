'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import type { Reminder, RefillItem } from '@/lib/firebase/firestore';
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

const parseQuantity = (quantity: string): number => {
  if (typeof quantity !== 'string') return 0;
  if (quantity.includes('/')) {
      const parts = quantity.split('/');
      if (parts.length === 2) {
          const numerator = parseFloat(parts[0]);
          const denominator = parseFloat(parts[1]);
          if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
              return numerator / denominator;
          }
      }
  }
  const num = parseFloat(quantity);
  return isNaN(num) ? 0 : num;
};


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
    // Initialize AudioContext on the client after the component mounts.
    // This is necessary for browsers that require user interaction to start audio.
    const initializeAudio = () => {
      if (!audioContext) {
        setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
      }
      window.removeEventListener('click', initializeAudio);
    };
    
    window.addEventListener('click', initializeAudio);

    return () => {
      window.removeEventListener('click', initializeAudio);
    }
  }, [audioContext]);
  
  const playBeep = () => {
    if (!audioContext) return;
    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
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
    
    const dismissedReminder = dueReminder;
    setDueReminder(null);

    // Note: Beeping stops automatically due to the useEffect cleanup
    
    // Update inventory
    try {
        const refillItemsRef = collection(firestore, 'users', user.uid, 'refills');
        const q = query(refillItemsRef, where('name', '==', dismissedReminder.medicineName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const refillDoc = querySnapshot.docs[0];
            const refillItem = refillDoc.data() as RefillItem;
            const quantityToDecrement = parseQuantity(dismissedReminder.quantity);

            if (quantityToDecrement > 0 && refillItem.remainingQuantity >= quantityToDecrement) {
                const newQuantity = refillItem.remainingQuantity - quantityToDecrement;
                await updateDoc(refillDoc.ref, { remainingQuantity: newQuantity });
            }
        }
    } catch (error) {
        console.error("Failed to update refill item:", error);
    }


    // Delete from Firestore
    try {
        if (dismissedReminder.id) {
            const reminderRef = doc(firestore, 'users', user.uid, 'reminders', dismissedReminder.id);
            await deleteDoc(reminderRef);
        }
    } catch (error) {
        console.error("Failed to delete reminder:", error);
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
