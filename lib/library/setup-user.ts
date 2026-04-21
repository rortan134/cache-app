import { prisma } from "@/prisma";
import { PRESET_COLLECTIONS } from "./presets";
import { normalizeCollectionName } from "@/lib/strings";

export async function setupUserCollections(userId: string) {
    const data = PRESET_COLLECTIONS.map((preset) => {
        const normalized = normalizeCollectionName(preset.name);
        return {
            description: preset.description,
            name: normalized.name,
            nameKey: normalized.nameKey,
            userId,
        };
    });

    await prisma.collection.createMany({
        data,
        skipDuplicates: true,
    });
}
