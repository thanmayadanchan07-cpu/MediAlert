
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Reminder } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Bell, Trash2, Loader2, BellRing } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const reminderSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required.'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:MM format (e.g., 09:00).'),
  type: z.enum(['Morning', 'Afternoon', 'Night', 'Custom']),
});

const reminderIllustration = PlaceHolderImages.find(img => img.id === 'reminder-illustration');

export default function ReminderPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const remindersQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'reminders') : null
  , [user, firestore]);
  const { data: reminders, isLoading: remindersLoading } = useCollection<Reminder>(remindersQuery);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof reminderSchema>>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { medicineName: '', time: '', type: 'Morning' },
  });

  const onSubmit = async (values: z.infer<typeof reminderSchema>) => {
    if (!user) {
      toast({ title: 'Not authenticated', description: 'You must be logged in to manage reminders.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const collectionRef = collection(firestore, 'users', user.uid, 'reminders');
    try {
      addDocumentNonBlocking(collectionRef, values as Omit<Reminder, 'id'>);
      toast({ title: 'Success', description: 'New reminder set.' });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not save the reminder.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (reminderId: string) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'reminders', reminderId);
    try {
      deleteDocumentNonBlocking(docRef);
      toast({ title: 'Reminder removed', description: 'The reminder has been deleted.' });
    } catch {
      toast({ title: 'Error', description: 'Could not delete the reminder.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold">Medicine Reminders</h1>
          <p className="text-muted-foreground mt-2 text-lg">Set and manage your medication alerts.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!user || isUserLoading} onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Set Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Set New Reminder</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="medicineName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicine Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Vitamin D" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select reminder type" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Afternoon">Afternoon</SelectItem>
                          <SelectItem value="Night">Night</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (24-hour format)</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Reminder
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

        {reminderIllustration && (
            <div className="mb-12 rounded-lg overflow-hidden shadow-lg">
                <Image
                    src={reminderIllustration.imageUrl}
                    alt={reminderIllustration.description}
                    width={1080}
                    height={400}
                    className="w-full h-64 object-cover"
                    data-ai-hint={reminderIllustration.imageHint}
                />
            </div>
        )}

      {isUserLoading || remindersLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[...Array(3)].map((_, i) => <Card key={i}><CardHeader><div className="h-6 bg-muted rounded w-1/2"></div></CardHeader><CardContent><div className="h-4 bg-muted rounded w-full"></div></CardContent></Card>)}
        </div>
      ) : !user ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Log in to view your reminders</CardTitle>
            <CardDescription>Please log in to set and manage your reminders.</CardDescription>
          </CardHeader>
        </Card>
      ) : reminders && reminders.length === 0 ? (
        <Card className="text-center py-12 flex flex-col items-center">
            <BellRing className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <CardHeader>
            <CardTitle className="font-headline text-2xl">No Reminders Set</CardTitle>
            <CardDescription>Click "Set Reminder" to schedule your first medication alert.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reminders && reminders.map((reminder) => (
            <Card key={reminder.id} className="flex flex-col">
              <CardHeader className="flex-row items-center gap-4">
                <div className="bg-secondary p-3 rounded-full"><Bell className="h-6 w-6 text-primary" /></div>
                <div>
                  <CardTitle className="font-headline text-xl">{reminder.medicineName}</CardTitle>
                  <CardDescription>Type: {reminder.type}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-between">
                <p className="text-2xl font-bold font-mono">{reminder.time}</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete the reminder for {reminder.medicineName} at {reminder.time}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(reminder.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

    