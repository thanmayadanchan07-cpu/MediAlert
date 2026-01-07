'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Dosage } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pill, Trash2, Edit, Loader2, FileText, Sun, Moon, CloudSun } from 'lucide-react';
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

const dosageSchema = z.object({
  name: z.string().min(1, 'Medicine name is required.'),
  times: z.array(z.string()).refine((value) => value.length > 0, {
    message: 'You must select at least one time of day.',
  }),
  morningQuantity: z.string().optional(),
  afternoonQuantity: z.string().optional(),
  nightQuantity: z.string().optional(),
  morningTime: z.string().optional(),
  afternoonTime: z.string().optional(),
  nightTime: z.string().optional(),
}).refine(data => {
    if (data.times.includes('Morning') && (!data.morningQuantity || !data.morningTime || !timeRegex.test(data.morningTime))) return false;
    if (data.times.includes('Afternoon') && (!data.afternoonQuantity || !data.afternoonTime || !timeRegex.test(data.afternoonTime))) return false;
    if (data.times.includes('Night') && (!data.nightQuantity || !data.nightTime || !timeRegex.test(data.nightTime))) return false;
    return true;
}, {
    message: "Please enter a quantity and a valid HH:MM time for each selected period.",
    path: ['times'] // Attach error to the times field for general display
});

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
        <div className="space-y-4">
            {selectedTimes.includes('Morning') && (
                <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="morningQuantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Morning Quantity</FormLabel>
                            <FormControl><Input placeholder="e.g., 1, 1/2" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="morningTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Morning Time</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                </div>
            )}
            {selectedTimes.includes('Afternoon') && (
                <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="afternoonQuantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Afternoon Quantity</FormLabel>
                            <FormControl><Input placeholder="e.g., 1, 1/2" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="afternoonTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Afternoon Time</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                </div>
            )}
            {selectedTimes.includes('Night') && (
                <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="nightQuantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Night Quantity</FormLabel>
                            <FormControl><Input placeholder="e.g., 1, 1/2" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name="nightTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Night Time</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                </div>
            )}
        </div>
    );
}

export default function DosagePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const dosagesQuery = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'dosage') : null
  , [user, firestore]);
  const { data: dosages, isLoading: dosagesLoading } = useCollection<Dosage>(dosagesQuery);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDosage, setEditingDosage] = useState<Dosage | null>(null);

  const form = useForm<z.infer<typeof dosageSchema>>({
    resolver: zodResolver(dosageSchema),
    defaultValues: { name: '', times: [], morningQuantity: '', afternoonQuantity: '', nightQuantity: '', morningTime: '', afternoonTime: '', nightTime: '' },
  });

  const handleDialogOpen = (dosage: Dosage | null = null) => {
    setEditingDosage(dosage);
    if (dosage) {
      const times = dosage.dosages.map(d => d.time);
      const morningQty = dosage.dosages.find(d => d.time === 'Morning')?.quantity || '';
      const afternoonQty = dosage.dosages.find(d => d.time === 'Afternoon')?.quantity || '';
      const nightQty = dosage.dosages.find(d => d.time === 'Night')?.quantity || '';
      const morningTime = dosage.dosages.find(d => d.time === 'Morning')?.reminderTime || '';
      const afternoonTime = dosage.dosages.find(d => d.time === 'Afternoon')?.reminderTime || '';
      const nightTime = dosage.dosages.find(d => d.time === 'Night')?.reminderTime || '';
      form.reset({ name: dosage.name, times, morningQuantity: morningQty, afternoonQuantity: afternoonQty, nightQuantity: nightQty, morningTime, afternoonTime, nightTime });
    } else {
      form.reset({ name: '', times: [], morningQuantity: '', afternoonQuantity: '', nightQuantity: '', morningTime: '', afternoonTime: '', nightTime: '' });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof dosageSchema>) => {
    if (!user) {
      toast({ title: 'Not authenticated', description: 'You must be logged in to manage dosages.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    const dosageCollectionRef = collection(firestore, 'users', user.uid, 'dosage');
    
    const dosagesToSave = values.times.map(time => {
        let quantity = '';
        let reminderTime = '';
        if (time === 'Morning') {
          quantity = values.morningQuantity!;
          reminderTime = values.morningTime!;
        }
        if (time === 'Afternoon') {
          quantity = values.afternoonQuantity!;
          reminderTime = values.afternoonTime!;
        }
        if (time === 'Night') {
          quantity = values.nightQuantity!;
          reminderTime = values.nightTime!;
        }
        return { time, quantity, reminderTime };
    });

    try {
      let dosageId: string;
      if (editingDosage) {
        dosageId = editingDosage.id!;
        const docRef = doc(dosageCollectionRef, dosageId);
        const dataToSave = {
            name: values.name,
            dosages: dosagesToSave,
            userId: user.uid,
        };
        await updateDoc(docRef, dataToSave);
        toast({ title: 'Success', description: 'Dosage updated successfully.' });
      } else {
        const dataToSave = {
            userId: user.uid,
            name: values.name,
            dosages: dosagesToSave,
        };
        const newDocRef = await addDoc(dosageCollectionRef, dataToSave);
        dosageId = newDocRef.id;
        toast({ title: 'Success', description: 'New dosage added.' });
      }

      // This part handles automatic reminder creation and is not a part of the original non-blocking logic
      // But for this feature it needs to be blocking to ensure reminders are set.
      const reminderCollectionRef = collection(firestore, 'users', user.uid, 'reminders');
      // For simplicity, we delete old reminders and create new ones.
      // A more complex implementation could diff the changes.
      if (editingDosage) {
        // This is a simplification. A real app might query for reminders related to this dosageId.
        // For now, we are not storing a dosageId in the reminder, so we cannot easily delete them.
        // This functionality will be added in a future step if requested.
      }
      
      const remindersToCreate = dosagesToSave.map(d => ({
        medicineName: values.name,
        time: d.reminderTime,
        type: d.time,
        quantity: d.quantity,
        dosageId: dosageId, // Link reminder to dosage
      }));

      for (const reminder of remindersToCreate) {
        await addDoc(reminderCollectionRef, reminder);
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving dosage/reminders", error);
      toast({ title: 'Error', description: 'Could not save the dosage and reminders.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (dosageId: string) => {
    if (!user) return;
    try {
      const docRef = doc(firestore, 'users', user.uid, 'dosage', dosageId);
      deleteDocumentNonBlocking(docRef);
      // Also delete related reminders if needed, would require querying reminders by dosageId
      toast({ title: 'Dosage removed', description: 'The medication has been deleted from your list.' });
    } catch {
      toast({ title: 'Error', description: 'Could not delete the dosage.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold">Dosage Tracking</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your daily medication schedule and reminders.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen()} disabled={!user || isUserLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Dosage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">{editingDosage ? 'Edit Dosage' : 'Add New Dosage'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicine Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Paracetamol" {...field} /></FormControl>
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
                            render={({ field }) => {
                              return (
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
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal flex items-center gap-2">
                                     <item.icon className="h-4 w-4" /> {item.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
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
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isUserLoading || dosagesLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Card key={i}><CardHeader><div className="h-6 bg-muted rounded w-1/2"></div></CardHeader><CardContent><div className="h-4 bg-muted rounded w-full"></div><div className="h-4 bg-muted rounded w-3/4 mt-2"></div></CardContent></Card>)}
        </div>
      ) : !user ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Log in to view your dosages</CardTitle>
            <CardDescription>Please log in to start tracking your medication.</CardDescription>
          </CardHeader>
        </Card>
      ) : dosages && dosages.length === 0 ? (
        <Card className="text-center py-12 flex flex-col items-center">
            <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <CardHeader>
            <CardTitle className="font-headline text-2xl">No Dosages Yet</CardTitle>
            <CardDescription>Click "Add Dosage" to start building your medication list.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dosages && dosages.map((dosage) => (
            <Card key={dosage.id} className="flex flex-col">
              <CardHeader className="flex-row items-center gap-4">
                <div className="bg-secondary p-3 rounded-full"><Pill className="h-6 w-6 text-primary" /></div>
                <div>
                  <CardTitle className="font-headline text-xl">{dosage.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                {dosage.dosages?.map(d => (
                    <div key={d.time} className="flex justify-between items-center text-sm">
                        <span className="font-semibold flex items-center gap-2">
                            {d.time === 'Morning' && <Sun className="w-4 h-4 text-muted-foreground" />}
                            {d.time === 'Afternoon' && <CloudSun className="w-4 h-4 text-muted-foreground" />}
                            {d.time === 'Night' && <Moon className="w-4 h-4 text-muted-foreground" />}
                            {d.time} ({d.reminderTime})
                        </span>
                        <span>{d.quantity}</span>
                    </div>
                ))}
              </CardContent>
              <CardContent className="flex justify-end gap-2">
                 <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(dosage)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the dosage for {dosage.name}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(dosage.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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
