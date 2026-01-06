'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // On success, the AuthProvider handles the state change, and the UI will update automatically.
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
        try {
          const newUserCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
          const profileRef = doc(firestore, 'users', newUserCredential.user.uid, 'profile', 'data');
          setDocumentNonBlocking(profileRef, { email: newUserCredential.user.email }, { merge: true });
        } catch (createError) {
          const createAuthError = createError as AuthError;
          toast({
            title: 'Authentication Failed',
            description: createAuthError.message,
            variant: 'destructive',
          });
        }
      } else {
        let friendlyMessage = 'An unknown error occurred.';
        if (authError.code === 'auth/wrong-password') {
            friendlyMessage = 'Incorrect password. Please try again.';
        } else if (authError.code === 'auth/invalid-email') {
            friendlyMessage = 'The email address is not valid.';
        }
        toast({
          title: 'Authentication Failed',
          description: friendlyMessage,
          variant: 'destructive',
        });
      }
    } finally {
        setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-body font-bold">Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} className="py-6 text-base"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-body font-bold">Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} className="py-6 text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full font-bold text-lg py-6" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login / Sign Up'}
        </Button>
      </form>
    </Form>
  );
}
