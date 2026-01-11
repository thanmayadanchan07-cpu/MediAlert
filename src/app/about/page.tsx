'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';

export default function AboutPage() {

  return (
    <div className="space-y-16">
      <section className="text-center">
        <h1 className="font-headline text-3xl md:text-4xl font-bold">About MediAlert</h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
          MediAlert is your trusted partner in health management. We are committed to making medication management simple, accessible, and stress-free for everyone, everywhere. Our mission is to empower you to take control of your health with an easy-to-use platform that sends timely medication reminders, tracks dosages, and provides smart alerts for prescription refills. At MediAlert, we believe that managing your health should be straightforward and worry-free. Our app helps you organize your prescriptions, monitor your intake, and avoid running out of essential medicines. Whether you're managing multiple medications or just a single daily vitamin, we're here to support you every step of the way, ensuring you never miss a dose.
        </p>
        <div className="mt-8 max-w-4xl mx-auto">
            <Image
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxoZWFsdGhjYXJlJTIwdGVhbXxlbnwwfHx8fDE3MjQzMzY4OTB8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="A diverse group of healthcare professionals standing together in a modern hospital hallway."
                width={1080}
                height={720}
                className="rounded-lg object-cover w-full h-auto"
                data-ai-hint="healthcare team"
            />
        </div>
      </section>
    </div>
  );
}
