import { z } from "zod";
const text = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().min(1).max(500).optional();
const validGtin = (value: string) => {
  const digits = [...value].map(Number);
  const check = digits.pop();
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 ? 1 : 3), 0);
  return check === (10 - (sum % 10)) % 10;
};
export const productSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  name: text,
  brand: text,
  sku: z
    .string()
    .trim()
    .regex(/^[\x21-\x7e]+$/)
    .max(100)
    .optional(),
  gtin: z
    .string()
    .regex(/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/)
    .refine(validGtin, "GTIN inválido")
    .optional(),
  mpn: text.optional(),
  description: z.string().trim().min(1).max(5000),
  category: text,
  family: z.array(text).max(10).optional(),
  notes: z.array(text).max(20),
  olfactoryPyramid: z
    .object({
      top: z.array(text).max(20),
      heart: z.array(text).max(20),
      base: z.array(text).max(20),
    })
    .optional(),
  aromaDescription: z.string().trim().min(1).max(5000).optional(),
  idealFor: z.array(text).max(20).optional(),
  duration: optionalText,
  projection: optionalText,
  concentration: optionalText,
  images: z
    .array(
      z.object({
        publicId: text,
        url: z.url().startsWith("https://res.cloudinary.com/"),
        alt: text,
      }),
    )
    .min(1)
    .max(10),
  variants: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^[a-zA-Z0-9-]+$/)
          .max(80),
        size: text,
        price: z.number().int().positive().max(100000000),
        available: z.boolean(),
      }),
    )
    .min(1)
    .max(20)
    .refine(
      (v) => new Set(v.map((x) => x.id)).size === v.length,
      "Identificadores de presentación repetidos",
    ),
  status: z.enum(["draft", "published"]),
  featured: z.boolean(),
});
export const settingsSchema = z.object({
  name: text,
  whatsapp: z.string().regex(/^$|^[1-9]\d{7,14}$/),
});
