'use server';

/**
 * @fileOverview A flow that prioritizes delivery routes for beverage cart drivers.
 *
 * - prioritizeDeliveryRoutes - A function that suggests the most efficient delivery route.
 * - PrioritizeDeliveryRoutesInput - The input type for the prioritizeDeliveryRoutes function.
 * - PrioritizeDeliveryRoutesOutput - The return type for the prioritizeDeliveryRoutes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrioritizeDeliveryRoutesInputSchema = z.object({
  currentLocation: z.object({
    latitude: z.number().describe('The current latitude of the beverage cart.'),
    longitude: z.number().describe('The current longitude of the beverage cart.'),
  }).describe('The current location of the beverage cart.'),
  openOrders: z.array(z.object({
    orderId: z.string().describe('The unique identifier for the order.'),
    deliveryLocation: z.object({
      latitude: z.number().describe('The latitude of the delivery location.'),
      longitude: z.number().describe('The longitude of the delivery location.'),
    }).describe('The delivery location for the order.'),
  })).describe('A list of open orders with their delivery locations.'),
});
export type PrioritizeDeliveryRoutesInput = z.infer<typeof PrioritizeDeliveryRoutesInputSchema>;

const PrioritizeDeliveryRoutesOutputSchema = z.object({
  prioritizedRoute: z.array(z.string()).describe('An ordered list of order IDs representing the suggested delivery route.'),
  reasoning: z.string().describe('The reasoning behind the suggested route.'),
});
export type PrioritizeDeliveryRoutesOutput = z.infer<typeof PrioritizeDeliveryRoutesOutputSchema>;

export async function prioritizeDeliveryRoutes(input: PrioritizeDeliveryRoutesInput): Promise<PrioritizeDeliveryRoutesOutput> {
  return prioritizeDeliveryRoutesFlow(input);
}

const prioritizeDeliveryRoutesPrompt = ai.definePrompt({
  name: 'prioritizeDeliveryRoutesPrompt',
  input: {schema: PrioritizeDeliveryRoutesInputSchema},
  output: {schema: PrioritizeDeliveryRoutesOutputSchema},
  prompt: `You are a route optimization expert for a beverage delivery service on a golf course. Given the current location of the beverage cart and a list of open orders with their delivery locations, suggest the most efficient delivery route to minimize delivery time and maximize customer satisfaction.

  Current Location:
  Latitude: {{{currentLocation.latitude}}}
  Longitude: {{{currentLocation.longitude}}}

  Open Orders:
  {{#each openOrders}}
  Order ID: {{{orderId}}}
  Delivery Location:
  Latitude: {{{deliveryLocation.latitude}}}
  Longitude: {{{deliveryLocation.longitude}}}
  {{/each}}

  Prioritized Route: Please provide an ordered list of order IDs representing the suggested delivery route. Explain your reasoning for the suggested route.
  `,
});

const prioritizeDeliveryRoutesFlow = ai.defineFlow(
  {
    name: 'prioritizeDeliveryRoutesFlow',
    inputSchema: PrioritizeDeliveryRoutesInputSchema,
    outputSchema: PrioritizeDeliveryRoutesOutputSchema,
  },
  async input => {
    const {output} = await prioritizeDeliveryRoutesPrompt(input);
    return output!;
  }
);
