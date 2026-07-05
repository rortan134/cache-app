import {
    type CollectionTemplateOption,
    TEMPLATES,
} from "@/lib/collections/templates";
import { normalizeCollectionName } from "@/lib/common/strings";

const MAX_RECOMMENDATIONS = 2;

export function recommendCollectionTemplates(args: {
    existingNameKeys: ReadonlySet<string>;
}): CollectionTemplateOption[] {
    return TEMPLATES.filter(
        (template) =>
            !args.existingNameKeys.has(
                normalizeCollectionName(template.name).nameKey
            )
    ).slice(0, MAX_RECOMMENDATIONS);
}
