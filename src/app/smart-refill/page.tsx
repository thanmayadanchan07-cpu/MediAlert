'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { RefillItem } from '@/lib/firebase/firestore';
import { getPersonalizedRefillSuggestion, type PersonalizedRefillSuggestionOutput } from '@/ai/flows/personalized-refill-suggestions';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Box, Trash2, Edit, Loader2, PackageSearch, Package, ExternalLink, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

const refillSchema = z.object({
  name: z.string().min(1, 'Medicine name is required.'),
  totalQuantity: z.coerce.number().min(1, 'Total quantity must be at least 1.'),
  remainingQuantity: z.coerce.number().min(0, 'Remaining quantity cannot be negative.'),
});

const suggestionSchema = z.object({
  medication: z.string().min(1, 'Medication name is required.'),
  location: z.string().min(1, 'Your location is required.'),
});

const LOW_STOCK_THRESHOLD = 0.2; // 20%

export default function SmartRefillPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const refillItemsQuery = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'refills') : null
  , [user, firestore]);
  const { data: refillItems, isLoading: itemsLoading } = useCollection<RefillItem>(refillItemsQuery);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RefillItem | null>(null);
  
  const [suggestion, setSuggestion] = useState<PersonalizedRefillSuggestionOutput | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const refillForm = useForm<z.infer<typeof refillSchema>>({
    resolver: zodResolver(refillSchema),
    defaultValues: { name: '', totalQuantity: 10, remainingQuantity: 10 },
  });

  const suggestionForm = useForm<z.infer<typeof suggestionSchema>>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: { medication: '', location: '' },
  });

  const handleDialogOpen = (item: RefillItem | null = null) => {
    setEditingItem(item);
    refillForm.reset(item ? { name: item.name, totalQuantity: item.totalQuantity, remainingQuantity: item.remainingQuantity } : { name: '', totalQuantity: 10, remainingQuantity: 10 });
    setIsDialogOpen(true);
  };

  const onRefillSubmit = async (values: z.infer<typeof refillSchema>) => {
    if (!user) return;
    setIsSubmitting(true);
    const collectionRef = collection(firestore, 'users', user.uid, 'refills');
    try {
      if (editingItem) {
        const docRef = doc(collectionRef, editingItem.id!);
        updateDocumentNonBlocking(docRef, values);
        toast({ title: 'Success', description: 'Inventory updated.' });
      } else {
        addDocumentNonBlocking(collectionRef, { ...values, userId: user.uid });
        toast({ title: 'Success', description: 'New medicine added to inventory.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Could not save the item.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (itemId: string) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'refills', itemId);
    try {
      deleteDocumentNonBlocking(docRef);
      toast({ title: 'Item removed', description: 'The item has been deleted from your inventory.' });
    } catch {
      toast({ title: 'Error', description: 'Could not delete the item.', variant: 'destructive' });
    }
  };

  const onSuggestionSubmit = async (values: z.infer<typeof suggestionSchema>) => {
    setIsSuggesting(true);
    setSuggestion(null);
    try {
      const result = await getPersonalizedRefillSuggestion(values);
      setSuggestion(result);
    } catch (error) {
      toast({ title: 'Suggestion Error', description: 'Could not get a suggestion at this time.', variant: 'destructive' });
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-12">
      <div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold">Smart Refill</h1>
            <p className="text-muted-foreground mt-2 text-lg">Track your medicine inventory and get refill alerts.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleDialogOpen()} disabled={!user || isUserLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-headline text-2xl">{editingItem ? 'Edit Item' : 'Add to Inventory'}</DialogTitle></DialogHeader>
              <Form {...refillForm}>
                <form onSubmit={refillForm.handleSubmit(onRefillSubmit)} className="space-y-4 py-4">
                  {/* Form fields for refill item */}
                  <FormField control={refillForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Medicine Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={refillForm.control} name="totalQuantity" render={({ field }) => (<FormItem><FormLabel>Total Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={refillForm.control} name="remainingQuantity" render={({ field }) => (<FormItem><FormLabel>Remaining Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        {/* Inventory list display */}
        {isUserLoading || itemsLoading ? <div className="h-24 bg-muted rounded-lg animate-pulse" />
        : !user ? <Card className="text-center py-12"><CardHeader><CardTitle>Log in to track inventory</CardTitle></CardHeader></Card>
        : refillItems && refillItems.length === 0 ? (
          <Card className="text-center py-12 flex flex-col items-center">
            <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Inventory is Empty</CardTitle>
              <CardDescription>Click "Add Item" to start tracking your medicine stock.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {refillItems && refillItems.map(item => {
              const percentage = item.totalQuantity > 0 ? (item.remainingQuantity / item.totalQuantity) * 100 : 0;
              const isLowStock = percentage / 100 <= LOW_STOCK_THRESHOLD;
              return (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-headline text-xl">{item.name}</CardTitle>
                        <CardDescription>{item.remainingQuantity} / {item.totalQuantity} units remaining</CardDescription>
                      </div>
                      {isLowStock && <Badge variant="destructive">Low Stock</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={percentage} className="h-3" />
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(item)}><Edit className="h-4 w-4" /></Button>
                      <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {item.name} from your inventory.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(item.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <div className="mb-8">
            <h2 className="font-headline text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary" /> Personalized Refill Suggestion
            </h2>
            <p className="text-muted-foreground mt-2 text-lg">Let AI find the best deal for your medication.</p>
        </div>
        <Card>
            <CardContent className="p-6">
                 <Form {...suggestionForm}>
                    <form onSubmit={suggestionForm.handleSubmit(onSuggestionSubmit)} className="grid md:grid-cols-3 gap-4 items-end">
                        <FormField control={suggestionForm.control} name="medication" render={({ field }) => (<FormItem><FormLabel>Medication</FormLabel><FormControl><Input placeholder="Enter medicine name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={suggestionForm.control} name="location" render={({ field }) => (<FormItem><FormLabel>Your Location</FormLabel><FormControl><Input placeholder="e.g., City, State" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="submit" disabled={isSuggesting || !user}>{isSuggesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Find Best Price</Button>
                    </form>
                    {!user && <p className="text-sm text-destructive mt-2">Please log in to use this feature.</p>}
                 </Form>
            </CardContent>
        </Card>
        
        {isSuggesting && <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>}
        
        {suggestion && (
            <Card className="mt-6 bg-accent/20 border-accent">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 font-headline"><PackageSearch className="w-7 h-7" /> AI Suggestion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm font-bold text-muted-foreground">RETAILER</p>
                        <p className="text-xl font-bold text-primary">{suggestion.retailer}</p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-muted-foreground">PRICE</p>
                        <p className="text-2xl font-extrabold">${suggestion.price.toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm font-bold text-muted-foreground">REASON</p>
                        <p className="text-base">{suggestion.reason}</p>
                    </div>
                    <Button asChild>
                        <a href={suggestion.url} target="_blank" rel="noopener noreferrer">
                            Purchase Now <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                    </Button>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
