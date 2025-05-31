import { z } from 'zod';

export const loginSchema = z.object({
  password: z.string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
});

export const priceSchema = z.object({
  price: z.number()
    .positive('Il prezzo deve essere maggiore di 0')
    .max(999, 'Il prezzo non può superare 999€')
});

export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date()
}).refine(data => data.endDate >= data.startDate, {
  message: "La data di fine deve essere successiva alla data di inizio",
  path: ["endDate"]
});