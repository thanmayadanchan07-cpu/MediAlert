'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { collection } from 'firebase/firestore';

const feedbackSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters.'),
});

const faqItems = [
  {
    question: 'How does MediAlert protect my data?',
    answer: 'Your data is stored securely in Firestore with security rules that ensure only you can access your information. All communication is encrypted.',
  },
  {
    question: 'Is this app free to use?',
    answer: 'Yes, MediAlert is completely free to use for managing your medication schedules and reminders.',
  },
  {
    question: 'How do the smart refill alerts work?',
    answer: 'When you log your medication intake, the app automatically updates your inventory. When the stock reaches a low threshold you set, you will receive a notification.',
  },
  {
    question: 'Can I use this app for my family members?',
    answer: 'Currently, each account is tied to a single user. We are exploring options for family management in future updates.',
  },
];

const teamImage = PlaceHolderImages.find(img => img.id === 'about-team');

export default function AboutPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { message: '' },
  });

  const onSubmit = async (values: z.infer<typeof feedbackSchema>) => {
    if (!user || !user.email) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in to send feedback.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      if (!firestore) throw new Error("Firestore not available");
      const feedbackCollectionRef = collection(firestore, 'users', user.uid, 'feedback');
      addDocumentNonBlocking(feedbackCollectionRef, { userId: user.uid, email: user.email, message: values.message, timestamp: new Date().toISOString() });
      toast({ title: 'Feedback Sent!', description: "Thank you for helping us improve." });
      form.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not send feedback at this time.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-16">
      <section className="text-center">
        <h1 className="font-headline text-3xl md:text-4xl font-bold">About MediAlert</h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
          We are committed to making medication management simple, accessible, and stress-free for everyone, everywhere.
        </p>
        <div className="mt-8 max-w-4xl mx-auto">
            {teamImage && (
                <Image
                    src={teamImage.imageUrl}
                    alt={teamImage.description}
                    width={1080}
                    height={720}
                    className="rounded-lg object-cover w-full"
                    data-ai-hint={teamImage.imageHint}
                />
            )}
        </div>
      </section>

      <section>
        <h2 className="text-center font-headline text-3xl font-bold mb-8">Frequently Asked Questions</h2>
        <Card>
          <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="font-headline text-lg font-semibold">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-center font-headline text-3xl font-bold mb-8">Send Us Feedback</h2>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Share Your Thoughts</CardTitle>
            <CardDescription>We'd love to hear from you. Let us know how we can improve.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us what you think..."
                          className="min-h-[120px]"
                          disabled={!user || isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={!user || isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Feedback"}
                </Button>
                {!user && <p className="text-sm text-destructive mt-2">Please log in to submit feedback.</p>}
              </form>
            </Form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
