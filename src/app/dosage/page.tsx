'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Dosage } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pill, Trash2, Edit, X, Loader2, FileText, Sun, Moon, CloudSun } from 'lucide-react';
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

const dosageSchema = z.object({
  name: z.string().min(1, 'Medicine name is required.'),
  quantity: z.string().min(1, 'Dosage quantity is required.'),
  time: z.array(z.string()).refine((value) => value.length > 0, {
    message: 'You must select at least one time of day.',
  }),
});

const timeOptions = [
  { id: 'Morning', label: 'Morning', icon: Sun },
  { id: 'Afternoon', label: 'Afternoon', icon: CloudSun },
  { id: 'Night', label: 'Night', icon: Moon },
];

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
    defaultValues: { name: '', quantity: '', time: [] },
  });

  const handleDialogOpen = (dosage: Dosage | null = null) => {
    setEditingDosage(dosage);
    if (dosage) {
      const timeArray = Array.isArray(dosage.time) ? dosage.time : dosage.time.split(', ');
      form.reset({ name: dosage.name, quantity: dosage.quantity, time: timeArray });
    } else {
      form.reset({ name: '', quantity: '', time: [] });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof dosageSchema>) => {
    if (!user) {
      toast({ title: 'Not authenticated', description: 'You must be logged in to manage dosages.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    const collectionRef = collection(firestore, 'users', user.uid, 'dosage');
    const dataToSave = {
      ...values,
      time: values.time.join(', '),
    };

    try {
      if (editingDosage) {
        const docRef = doc(collectionRef, editingDosage.id!);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Success', description: 'Dosage updated successfully.' });
      } else {
        addDocumentNonBlocking(collectionRef, dataToSave);
        toast({ title: 'Success', description: 'New dosage added.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Could not save the dosage.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (dosageId: string) => {
    if (!user) return;
    try {
      const docRef = doc(firestore, 'users', user.uid, 'dosage', dosageId);
      deleteDocumentNonBlocking(docRef);
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
          <p className="text-muted-foreground mt-2 text-lg">Manage your daily medication schedule.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen()} disabled={!user || isUserLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Dosage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
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
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity / Dosage</FormLabel>
                    <FormControl><Input placeholder="e.g., 1 tablet, 5ml" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="time"
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
                            name="time"
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
                  <CardDescription>Time: {dosage.time}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-lg font-semibold">{dosage.quantity}</p>
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

    