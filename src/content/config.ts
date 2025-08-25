// 1. Import utilities from `astro:content`
import { defineCollection, z } from "astro:content";

// 2. Define your collection(s)
const blogCollection = defineCollection({
	type: 'content',
	schema: z.object({
		draft: z.boolean(),
		title: z.string(),
		snippet: z.string(),
		image: z.object({
			src: z.string(),
			alt: z.string(),
		}),
		publishDate: z.string().or(z.date()).transform((val) => {
			// Handle both string and Date inputs
			if (val instanceof Date) return val;
			// Parse string dates more reliably
			const date = new Date(val);
			if (isNaN(date.getTime())) {
				throw new Error(`Invalid date format: ${val}`);
			}
			return date;
		}),
		author: z.string().default("TikTokio Team"),
		category: z.string(),
		tags: z.array(z.string()),
	}),
});

// 3. Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
	blog: blogCollection,
};
