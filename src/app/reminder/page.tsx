
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Reminder } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Bell, Trash2, Loader2, BellRing, Sun, Moon, CloudSun } from 'lucide-react';
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

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const reminderSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required.'),
  times: z.array(z.string()).refine((value) => value.length > 0, {
    message: 'You must select at least one time of day.',
  }),
  morningTime: z.string().optional(),
  afternoonTime: z.string().optional(),
  nightTime: z.string().optional(),
}).refine(data => !data.times.includes('Morning') || (data.morningTime && timeRegex.test(data.morningTime)), {
  message: 'Please enter a valid HH:MM time for Morning.',
  path: ['morningTime'],
}).refine(data => !data.times.includes('Afternoon') || (data.afternoonTime && timeRegex.test(data.afternoonTime)), {
  message: 'Please enter a valid HH:MM time for Afternoon.',
  path: ['afternoonTime'],
}).refine(data => !data.times.includes('Night') || (data.nightTime && timeRegex.test(data.nightTime)), {
  message: 'Please enter a valid HH:MM time for Night.',
  path: ['nightTime'],
});


const reminderIllustration = PlaceHolderImages.find(img => img.id === 'reminder-illustration');
const timeOptions = [
  { id: 'Morning', label: 'Morning', icon: Sun },
  { id: 'Afternoon', label: 'Afternoon', icon: CloudSun },
  { id: 'Night', label: 'Night', icon: Moon },
];


function SelectedTimesWatcher({ control }: { control: any }) {
    const selectedTimes = useWatch({
        control,
        name: 'times',
        defaultValue: []
    });

    return (
        <>
            {selectedTimes.includes('Morning') && (
                <FormField
                    control={control}
                    name="morningTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Morning Time (HH:MM)</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            {selectedTimes.includes('Afternoon') && (
                <FormField
                    control={control}
                    name="afternoonTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Afternoon Time (HH:MM)</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            {selectedTimes.includes('Night') && (
                <FormField
                    control={control}
                    name="nightTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Night Time (HH:MM)</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </>
    );
}

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
    defaultValues: { medicineName: '', times: [], morningTime: '', afternoonTime: '', nightTime: '' },
  });

  const onSubmit = async (values: z.infer<typeof reminderSchema>) => {
    if (!user) {
      toast({ title: 'Not authenticated', description: 'You must be logged in to manage reminders.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const collectionRef = collection(firestore, 'users', user.uid, 'reminders');
    
    const remindersToSave: Omit<Reminder, 'id'>[] = [];
    if (values.times.includes('Morning') && values.morningTime) {
        remindersToSave.push({ medicineName: values.medicineName, type: 'Morning', time: values.morningTime });
    }
    if (values.times.includes('Afternoon') && values.afternoonTime) {
        remindersToSave.push({ medicineName: values.medicineName, type: 'Afternoon', time: values.afternoonTime });
    }
    if (values.times.includes('Night') && values.nightTime) {
        remindersToSave.push({ medicineName: values.medicineName, type: 'Night', time: values.nightTime });
    }

    try {
      await Promise.all(remindersToSave.map(reminder => addDocumentNonBlocking(collectionRef, reminder)));
      toast({ title: 'Success', description: 'New reminder(s) set.' });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not save the reminder(s).', variant: 'destructive' });
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
              <DialogTitle className="font-headline text-2xl">Set New Reminder(s)</DialogTitle>
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

                <FormField
                  control={form.control}
                  name="times"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Time of Day</FormLabel>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {timeOptions.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="times"
                            render={({ field }) => (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(field.value?.filter((value) => value !== item.id));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center gap-2">
                                   <item.icon className="h-4 w-4" /> {item.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <SelectedTimesWatcher control={form.control} />
                
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Reminder(s)
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
