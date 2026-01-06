# **App Name**: MediAlert

## Core Features:

- User Authentication: Secure user authentication using Firebase Authentication (Email + Password).
- Dosage Management: Add, edit, and delete medicine entries with name, time, and quantity. Persisted using Firestore.
- Reminder Scheduling: Schedule medicine reminders with time picker and custom options, linked to dosage and pushed via Cloud Messaging.
- Smart Refill: Track medicine inventory, get low-stock warnings, and quick links to online purchase buttons using Firestore for data persistence.
- User Profile: Create and manage user profiles, storing user data in Firestore.
- Feedback Collection: Collect user feedback through a form (Email, Message) and store it securely using Firestore.
- Personalized Refill Suggestions: Leverage a tool to suggest the most appropriate retailer, considering the medication, the user's location, and pricing data.

## Style Guidelines:

- Primary color: Electric Indigo (#5C6BC0) for headers, buttons, and interactive elements.
- Secondary color: Pale Lavender (#E8EAF6) for cards and grouping related sections.
- Background color: Pure White (#FFFFFF) for a clean background.
- Text color: Carbon Black (#121212) for high-contrast labels.
- Accent color: Success Green (#00C853) for success states, notifications, and refill alerts.
- App Title / Header / Tagline: 'Nunito' ExtraBold, 32–36sp.
- Section Headings: 'Nunito' Bold, 24–26sp.
- Card Titles / Feature Names: 'Nunito' SemiBold, 20–22sp.
- Body Text / Inputs / Descriptions: 'Nunito' Regular, 16–18sp.
- Buttons: 'Nunito' Bold, 18–20sp.
- Use Material Icons / Lucide Icons, with rounded cards and soft shadows.
- Top horizontal navigation bar: Home | Dosage | Reminder | Smart Refill | About.
- Subtle animations on state changes, like adding a dosage or refilling medication.