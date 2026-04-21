import "server-only";
import { GitHubApiError } from "./error";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_PAGE_SIZE = 100;
const MAX_GITHUB_STARRED_PAGES = 20;

type JsonRecord = Record<string, unknown>;

export interface GitHubImportableRepository {
    readonly caption: string | null;
    readonly externalId: string;
    readonly postedAt: Date | null;
    readonly sourceMetadata: Record<string, unknown>;
    readonly thumbnailUrl: string | null;
    readonly url: string;
}

export interface GitHubAuthenticatedUser {
    readonly avatarUrl: string | null;
    readonly id: string;
    readonly login: string | null;
    readonly name: string | null;
}

function asRecord(value: unknown): JsonRecord | null {
    return typeof value === "object" && value !== null
        ? (value as JsonRecord)
        : null;
}

function readString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readDate(value: unknown): Date | null {
    const raw = readString(value);
    if (!raw) {
        return null;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseGitHubApiError(payload: unknown, status: number): GitHubApiError {
    const record = asRecord(payload);
    const message =
        readString(record?.message) ??
        `GitHub API request failed with status ${status}.`;

    return new GitHubApiError({ message, status });
}

async function fetchGitHub(
    accessToken: string,
    path: string,
    searchParams?: URLSearchParams
): Promise<unknown> {
    const response = await fetch(
        `${GITHUB_API_BASE_URL}${path}${searchParams ? `?${searchParams.toString()}` : ""}`,
        {
            cache: "no-store",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${accessToken}`,
                "X-GitHub-Api-Version": "2022-11-28",
            },
        }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw parseGitHubApiError(payload, response.status);
    }

    return payload;
}

function parseAuthenticatedUser(
    payload: unknown
): GitHubAuthenticatedUser | null {
    const record = asRecord(payload);
    const numericId = readNumber(record?.id);
    if (numericId === null) {
        return null;
    }

    return {
        avatarUrl: readString(record?.avatar_url),
        id: String(numericId),
        login: readString(record?.login),
        name: readString(record?.name),
    };
}

function parseRepository(
    candidate: unknown
): GitHubImportableRepository | null {
    const record = asRecord(candidate);
    const numericId = readNumber(record?.id);
    const htmlUrl = readString(record?.html_url);

    if (numericId === null || !htmlUrl) {
        return null;
    }

    const owner = asRecord(record?.owner);
    const fullName = readString(record?.full_name);
    const language = readString(record?.language);
    const topics = Array.isArray(record?.topics)
        ? record.topics.filter(
              (topic): topic is string => typeof topic === "string"
          )
        : [];

    return {
        caption: readString(record?.description) ?? fullName,
        externalId: String(numericId),
        postedAt: readDate(record?.updated_at),
        sourceMetadata: {
            github: {
                defaultBranch: readString(record?.default_branch),
                fork: Boolean(record?.fork),
                fullName,
                importTimestamp: new Date().toISOString(),
                language,
                owner: {
                    avatarUrl: readString(owner?.avatar_url),
                    id: readNumber(owner?.id),
                    login: readString(owner?.login),
                },
                private: Boolean(record?.private),
                stargazersCount: readNumber(record?.stargazers_count),
                topics,
            },
        },
        thumbnailUrl: readString(owner?.avatar_url),
        url: htmlUrl,
    };
}

export async function getGitHubAuthenticatedUser(
    accessToken: string
): Promise<GitHubAuthenticatedUser> {
    const payload = await fetchGitHub(accessToken, "/user");
    const user = parseAuthenticatedUser(payload);

    if (!user) {
        throw new GitHubApiError({
            message: "GitHub did not return a valid user.",
            status: 502,
        });
    }

    return user;
}

export async function listGitHubStarredRepositories(
    accessToken: string
): Promise<GitHubImportableRepository[]> {
    const repositories: GitHubImportableRepository[] = [];

    for (let page = 1; page <= MAX_GITHUB_STARRED_PAGES; page += 1) {
        const payload = await fetchGitHub(
            accessToken,
            "/user/starred",
            new URLSearchParams({
                page: String(page),
                per_page: String(GITHUB_PAGE_SIZE),
            })
        );
        const rows = Array.isArray(payload) ? payload : [];
        const parsed = rows.flatMap((row) => {
            const repository = parseRepository(row);
            return repository ? [repository] : [];
        });

        repositories.push(...parsed);
        if (rows.length < GITHUB_PAGE_SIZE) {
            break;
        }
    }

    return repositories;
}
