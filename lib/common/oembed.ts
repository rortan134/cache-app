import * as z from "zod";

export const OembedSchema = z.object({
    html: z.string().min(1),
    provider: z.string().min(1),
    title: z.string().nullable(),
});

export type Oembed = z.infer<typeof OembedSchema>;
