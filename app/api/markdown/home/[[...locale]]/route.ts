import { BASE_URL } from "@/lib/common/constants";
import type { SupportedLocale } from "@/lib/common/constants";

const HOME_MARKDOWN = {
    "en-US": `# Cache

> The AI bookmark manager for busy people. Collect, organize, and rediscover everything you've saved across platforms.

## What Cache does

Cache brings your saved content into a single, searchable, actionable library.

- **Curate a personal library** — Search saved links, notes, recipes, lessons, and ideas when you need them.
- **Import everything you've already saved** — Sync bookmarks from Chrome, Instagram, TikTok, YouTube, X/Twitter, GitHub, Pinterest, and Google Photos.
- **Build useful collections** — Organize items into named collections, add priorities, and share collections publicly.
- **Make saving a habit** — Use automations and review workflows to bring important content back before it gets buried.
- **Search and read quickly** — Use full-text search, command shortcuts, and distraction-free Quick Look reading.
- **Keep the useful, drop the stale** — Smart Collections help separate actionable material from inspiration, duplicates, and broken links.

## AI features

- AI-powered smart collections organize new items automatically.
- AI summaries help you synthesize collections and sections.
- Cache's AI agent can help you find and brainstorm from your saved knowledge.

## Agent access

Cache exposes a Model Context Protocol (MCP) server so AI agents can read and write your library securely. The full setup and tool reference is available at [llms.txt](${BASE_URL}/llms.txt).

## Pricing

Cache has a free tier. Pro is available from $8/month with unlimited bookmarks, unlimited AI quota, and priority support.

## Links

- [Open Cache](${BASE_URL})
- [Install the Chrome extension](https://chromewebstore.google.com/detail/fibhdcjlclheehonialdpealhemmoikn)
- [GitHub repository](https://github.com/rortan134/cache-app)
- [Full agent context](${BASE_URL}/llms.txt)
`,
    "es-ES": `# Cache

> El gestor de marcadores con IA para personas ocupadas. Recopila, organiza y vuelve a descubrir todo lo que has guardado en distintas plataformas.

## Qué hace Cache

Cache reúne todo tu contenido guardado en una biblioteca única, consultable y útil.

- **Crea una biblioteca personal** — Busca enlaces, notas, recetas, lecciones e ideas guardadas cuando las necesites.
- **Importa todo lo que ya has guardado** — Sincroniza marcadores de Chrome, Instagram, TikTok, YouTube, X/Twitter, GitHub, Pinterest y Google Photos.
- **Crea colecciones útiles** — Organiza elementos en colecciones, añade prioridades y comparte colecciones públicamente.
- **Convierte el guardado en un hábito** — Usa automatizaciones y revisiones para recuperar contenido importante antes de que se pierda.
- **Busca y lee rápidamente** — Usa la búsqueda de texto completo, los atajos de comandos y la lectura sin distracciones de Quick Look.
- **Conserva lo útil y elimina lo obsoleto** — Las Colecciones inteligentes ayudan a separar lo accionable de la inspiración, los duplicados y los enlaces rotos.

## Funciones de IA

- Las Colecciones inteligentes con IA organizan automáticamente los elementos nuevos.
- Los resúmenes con IA ayudan a sintetizar colecciones y secciones.
- El agente de IA de Cache puede ayudarte a encontrar ideas y generar lluvias de ideas a partir de tu conocimiento guardado.

## Acceso para agentes

Cache ofrece un servidor de Model Context Protocol (MCP) para que los agentes de IA puedan leer y escribir en tu biblioteca de forma segura. La configuración completa y la referencia de herramientas están disponibles en [llms.txt](${BASE_URL}/llms.txt).

## Precios

Cache tiene un nivel gratuito. Pro está disponible desde 8 $/mes e incluye marcadores ilimitados, cuota de IA ilimitada y soporte prioritario.

## Enlaces

- [Abrir Cache](${BASE_URL})
- [Instalar la extensión de Chrome](https://chromewebstore.google.com/detail/fibhdcjlclheehonialdpealhemmoikn)
- [Repositorio en GitHub](https://github.com/rortan134/cache-app)
- [Contexto completo para agentes](${BASE_URL}/llms.txt)
`,
} satisfies Record<SupportedLocale, string>;

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ locale?: string[] }> }
): Promise<Response> {
    const { locale } = await params;
    const markdown =
        locale?.[0] === "es-ES"
            ? HOME_MARKDOWN["es-ES"]
            : HOME_MARKDOWN["en-US"];

    return new Response(markdown, {
        headers: {
            "Cache-Control":
                "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
            "Content-Type": "text/markdown; charset=utf-8",
            Vary: "Accept",
        },
    });
}
