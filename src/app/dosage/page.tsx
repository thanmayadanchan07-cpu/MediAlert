'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDosage, getDosages, updateDosage, deleteDosage, type Dosage } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pill, Trash2, Edit, X, Loader2, FileText } from 'lucide-react';
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
  time: z.string().min(1, 'Time is required.'),
});

export default function DosagePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [dosages, setDosages] = useState<Dosage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDosage, setEditingDosage] = useState<Dosage | null>(null);

  const form = useForm<z.infer<typeof dosageSchema>>({
    resolver: zodResolver(dosageSchema),
    defaultValues: { name: '', quantity: '', time: '' },
  });

  const fetchDosages = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const querySnapshot = await getDosages(user.uid);
      const userDosages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Dosage[];
      setDosages(userDosages);
    } catch (error) {
      toast({ title: 'Error fetching dosages', description: 'Could not load your medication list.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDosages();
    } else if (!authLoading) {
      setIsLoading(false);
      setDosages([]);
    }
  }, [user, authLoading]);

  const handleDialogOpen = (dosage: Dosage | null = null) => {
    setEditingDosage(dosage);
    if (dosage) {
      form.reset({ name: dosage.name, quantity: dosage.quantity, time: dosage.time });
    } else {
      form.reset({ name: '', quantity: '', time: '' });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof dosageSchema>) => {
    if (!user) {
      toast({ title: 'Not authenticated', description: 'You must be logged in to manage dosages.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingDosage) {
        await updateDosage(user.uid, editingDosage.id!, values);
        toast({ title: 'Success', description: 'Dosage updated successfully.' });
      } else {
        await addDosage(user.uid, values);
        toast({ title: 'Success', description: 'New dosage added.' });
      }
      await fetchDosages();
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
      await deleteDosage(user.uid, dosageId);
      toast({ title: 'Dosage removed', description: 'The medication has been deleted from your list.' });
      fetchDosages();
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
            <Button onClick={() => handleDialogOpen()} disabled={!user || authLoading}>
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
                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl><Input placeholder="e.g., After breakfast, 9:00 AM" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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

      {authLoading || isLoading ? (
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
      ) : dosages.length === 0 ? (
        <Card className="text-center py-12 flex flex-col items-center">
            <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <CardHeader>
            <CardTitle className="font-headline text-2xl">No Dosages Yet</CardTitle>
            <CardDescription>Click "Add Dosage" to start building your medication list.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dosages.map((dosage) => (
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
