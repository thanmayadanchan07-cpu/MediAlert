'use client';

import Image from 'next/image';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import LoginForm from '@/components/LoginForm';

const homeIllustration = PlaceHolderImages.find(img => img.id === 'home-illustration');
const reminderFeatureImage = PlaceHolderImages.find(img => img.id === 'reminder-feature');
const refillFeatureImage = PlaceHolderImages.find(img => img.id === 'refill-feature');
const dosageFeatureImage = PlaceHolderImages.find(img => img.id === 'dosage-feature');
const backupFeatureImage = PlaceHolderImages.find(img => img.id === 'backup-feature');


const features = [
  {
    image: reminderFeatureImage,
    title: 'Medicine Reminders',
    description: 'Set custom reminders and never miss a dose again.',
  },
  {
    image: refillFeatureImage,
    title: 'Smart Refill',
    description: 'Track your medicine stock and get timely refill alerts.',
  },
  {
    image: dosageFeatureImage,
    title: 'Dosage Tracking',
    description: 'Easily log your dosage and keep a history of your intake.',
  },
  {
    image: backupFeatureImage,
    title: 'Cloud Backup',
    description: 'Your data is securely backed up and accessible only by you.',
  },
];

export default function Home() {
  const { user, isUserLoading } = useUser();

  const WelcomeSection = () => (
    <div className="text-center">
      <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight">
        Welcome back!
      </h2>
      <p className="mt-4 text-lg text-muted-foreground font-body">
        You're all set. Manage your health with ease.
      </p>
    </div>
  );

  return (
    <div className="space-y-16 md:space-y-24">
      <section className="text-center pt-8">
        <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter text-primary">
          MediAlert
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl md:text-2xl text-foreground/80 font-body font-extrabold">
          Never Miss a Dose, Never Run Out of Medicines.
        </p>
        <p className="mt-6 max-w-3xl mx-auto text-xl text-muted-foreground">
            MediAlert is your personal health assistant, designed to help you manage your medications responsibly and stay on top of your health journey. With our intuitive interface, you can set reminders, track dosages, and get smart alerts for refills, all in one secure place.
        </p>
      </section>

      <section>
        <Card className="overflow-hidden shadow-lg border-none bg-card">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 items-center">
              <div className="p-8 md:p-12 order-2 md:order-1">
                {isUserLoading ? (
                  <div className="space-y-4 max-w-sm mx-auto">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-12 w-full mt-4" />
                  </div>
                ) : user ? (
                  <WelcomeSection />
                ) : (
                  <div className="max-w-sm mx-auto">
                    <h2 className="font-headline text-3xl font-bold mb-2">Get Started</h2>
                    <p className="text-muted-foreground mb-6 font-body">Log in or sign up to manage your medication.</p>
                    <LoginForm />
                  </div>
                )}
              </div>
              <div className="order-1 md:order-2 bg-primary/10">
                {homeIllustration && (
                  <Image
                    src={homeIllustration.imageUrl}
                    alt={homeIllustration.description}
                    width={800}
                    height={600}
                    className="w-full h-64 md:h-full object-cover"
                    data-ai-hint={homeIllustration.imageHint}
                    priority
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="text-center">
        <h2 className="font-headline text-3xl md:text-4xl font-bold mb-4">Features</h2>
        <p className="max-w-3xl mx-auto text-lg text-muted-foreground mb-12 font-body">
          Everything you need for a hassle-free medication management experience.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="text-left bg-white hover:shadow-xl transition-shadow flex flex-col">
              {feature.image && (
                <Image
                  src={feature.image.imageUrl}
                  alt={feature.image.description}
                  width={600}
                  height={400}
                  className="rounded-t-lg object-cover w-full h-40"
                  data-ai-hint={feature.image.imageHint}
                />
              )}
              <CardHeader>
                <CardTitle className="font-headline text-xl font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground font-body">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
