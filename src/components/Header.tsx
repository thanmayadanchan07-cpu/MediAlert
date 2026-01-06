'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pill, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOutUser } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from '@/lib/utils';
import React from 'react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dosage', label: 'Dosage' },
  { href: '/reminder', label: 'Reminder' },
  { href: '/smart-refill', label: 'Smart Refill' },
  { href: '/about', label: 'About' },
];

export default function Header() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOutUser();
  };

  const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <Link
      href={href}
      onClick={() => setIsSheetOpen(false)}
      className={cn(
        'font-bold transition-colors hover:text-primary text-lg',
        pathname === href ? 'text-primary' : 'text-foreground/60'
      )}
    >
      {children}
    </Link>
  );

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-headline text-2xl font-extrabold text-primary">
          <Pill className="h-7 w-7" />
          MediAlert
        </Link>
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href}>{link.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {!loading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer h-10 w-10 border-2 border-primary/50">
                  <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`} alt="User avatar" />
                  <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled>
                  <p className="font-bold text-foreground truncate">{user.email}</p>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-base">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:block h-10 w-10" /> // Placeholder for spacing
          )}
           <div className="md:hidden">
             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <div className="flex flex-col space-y-6 mt-8">
                    {navLinks.map((link) => (
                      <NavLink key={link.href} href={link.href}>{link.label}</NavLink>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
           </div>
        </div>
      </div>
    </header>
  );
}
