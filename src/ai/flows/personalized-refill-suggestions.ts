'use server';

/**
 * @fileOverview A flow that suggests the best online retailer for prescription refills based on medication, user location, and pricing.
 *
 * - getPersonalizedRefillSuggestion - A function that handles the refill suggestion process.
 * - PersonalizedRefillSuggestionInput - The input type for the getPersonalizedRefillSuggestion function.
 * - PersonalizedRefillSuggestionOutput - The return type for the getPersonalizedRefillSuggestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedRefillSuggestionInputSchema = z.object({
  medication: z.string().describe('The name of the medication to refill.'),
  location: z.string().describe('The user\u2019s location to find nearby retailers.'),
});
export type PersonalizedRefillSuggestionInput = z.infer<
  typeof PersonalizedRefillSuggestionInputSchema
>;

const PersonalizedRefillSuggestionOutputSchema = z.object({
  retailer: z.string().describe('The suggested online retailer for the refill.'),
  url: z.string().url().describe('The URL to purchase the medication from the retailer.'),
  price: z.number().describe('The price of the medication at the retailer.'),
  reason: z
    .string()
    .describe('The reason why this retailer was suggested.'),
});
export type PersonalizedRefillSuggestionOutput = z.infer<
  typeof PersonalizedRefillSuggestionOutputSchema
>;

export async function getPersonalizedRefillSuggestion(
  input: PersonalizedRefillSuggestionInput
): Promise<PersonalizedRefillSuggestionOutput> {
  return personalizedRefillSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedRefillSuggestionPrompt',
  input: {schema: PersonalizedRefillSuggestionInputSchema},
  output: {schema: PersonalizedRefillSuggestionOutputSchema},
  prompt: `You are an expert at finding the best online retailer for prescription refills.

  Based on the medication \"{{{medication}}}\" and the user's location \"{{{location}}}\", suggest the best online retailer to refill the prescription.

  Consider factors such as price, availability, and delivery time.

  Explain why you chose this retailer in the reason field.
  Return the retailer's name, the URL to purchase the medication, the price, and the reason for your suggestion.`,
});

const personalizedRefillSuggestionFlow = ai.defineFlow(
  {
    name: 'personalizedRefillSuggestionFlow',
    inputSchema: PersonalizedRefillSuggestionInputSchema,
    outputSchema: PersonalizedRefillSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
