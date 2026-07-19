import { normalizeCollectionName } from "@/lib/common/strings";

export interface CollectionTemplateOption {
    description: string;
    name: string;
    value: string;
}

export const TEMPLATES = [
    {
        description:
            "Articles, essays, and references to read when you have time.",
        name: "Reading List",
        value: "reading_list",
    },
    {
        description:
            "Visual references, examples, and sparks to kick off new ideas.",
        name: "Inspiration",
        value: "inspiration",
    },
    {
        description:
            "Step-by-step tutorials, docs, and practical guides to revisit.",
        name: "Tutorials & Guides",
        value: "tutorials_guides",
    },
    {
        description:
            "APIs, standards, specs, and evergreen references you keep coming back to.",
        name: "Reference Shelf",
        value: "reference_shelf",
    },
    {
        description: "Apps, services, libraries, and tools to keep handy.",
        name: "Tools & Resources",
        value: "tools_resources",
    },
    {
        description: "Videos, talks, and media to watch when you're ready.",
        name: "Watch Later",
        value: "watch_later",
    },
    {
        description:
            "Background research, references, and findings for ongoing work.",
        name: "Research Notes",
        value: "research_notes",
    },
    {
        description:
            "Potential product concepts, opportunities, and experiments.",
        name: "Product Ideas",
        value: "product_ideas",
    },
    {
        description:
            "Products, gear, and purchase links you're comparing or planning to buy.",
        name: "Shopping List",
        value: "shopping_list",
    },
    {
        description:
            "Restaurants, cafes, shops, and spots you want to check out soon.",
        name: "Places to Try",
        value: "places_to_try",
    },
    {
        description:
            "Trips, destinations, and travel resources to plan effectively.",
        name: "Travel Plans",
        value: "travel_plans",
    },
    {
        description:
            "DIY ideas, home upgrades, decor references, and projects for your space.",
        name: "Home Projects",
        value: "home_projects",
    },
    {
        description:
            "Workouts, routines, nutrition ideas, and wellness resources to revisit.",
        name: "Wellness & Fitness",
        value: "wellness_fitness",
    },
    {
        description:
            "Learning goals, resources, and opportunities for professional growth.",
        name: "Career Growth",
        value: "career_growth",
    },
    {
        description:
            "Tickets, events, deadlines, deals, and opportunities that are only useful for a short window and should be acted on soon.",
        name: "Time-sensitive",
        value: "time_sensitive",
    },
    {
        description:
            "Personal finance, investment research, budgeting tools, and financial planning resources.",
        name: "Finance & Investing",
        value: "finance_investing",
    },
    {
        description:
            "Online courses, educational platforms, learning paths, and skill-building resources to grow your knowledge.",
        name: "Courses & Learning",
        value: "courses_learning",
    },
] as const satisfies readonly CollectionTemplateOption[];

export type TemplateValue = (typeof TEMPLATES)[number]["value"];

export const TEMPLATE_BY_VALUE = new Map(
    TEMPLATES.map((template) => [template.value, template])
);

export const TEMPLATE_BY_NAME_KEY = new Map(
    TEMPLATES.map((template) => [
        normalizeCollectionName(template.name).nameKey,
        template,
    ])
);

export function templateDescriptionForNameKey(
    nameKey: string
): string | undefined {
    return TEMPLATE_BY_NAME_KEY.get(nameKey)?.description;
}
