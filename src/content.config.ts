import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const cases = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/cases" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    client: z.string(),
    year: z.string(),
    role: z.string(),
    deliverables: z.array(z.string()),
    order: z.number(),
    cover: z.string(),
    images: z.array(z.string()),
  }),
});

export const collections = { cases };
