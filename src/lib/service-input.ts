import { z } from "zod";

const nullableText = z
  .union([z.string(), z.null()])
  .transform((value) => value?.trim() || null);

const serviceFields = {
  code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(200),
  description: nullableText.optional(),
  durationHours: z.coerce.number().finite().positive().max(10_000),
  laborCost: z.coerce.number().finite().min(0).max(1_000_000_000),
  price: z.coerce.number().finite().min(0).max(1_000_000_000),
  warrantyMonths: z.coerce.number().int().min(0).max(1_200),
  active: z.boolean(),
};

export const createServiceSchema = z
  .object({
    ...serviceFields,
    description: serviceFields.description.default(null),
    durationHours: serviceFields.durationHours.default(1),
    laborCost: serviceFields.laborCost.default(0),
    price: serviceFields.price.default(0),
    warrantyMonths: serviceFields.warrantyMonths.default(0),
    active: serviceFields.active.default(true),
  })
  .strict();

export const updateServiceSchema = z
  .object(serviceFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });
