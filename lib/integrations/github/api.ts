import { IntegrationApiError } from "@/lib/integrations/error";
import {
    asProviderPayloadRecord,
    readPayloadDate,
    readPayloadNumber,
    readPayloadString,
} from "@/lib/integrations/provider-payload";
import type { Prisma } from "@/prisma/client/client";
import "server-only";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_PAGE_SIZE = 100;
const MAX_GITHUB_STARRED_PAGES = 20;

export interface GitHubImportableRepository {
    readonly caption: string | null;
    readonly externalId: string;
    readonly postedAt: Date | null;
    readonly sourceMetadata: Prisma.InputJsonObject;
    readonly thumbnailUrl: string | null;
    readonly url: string;
}

export interface GitHubAuthenticatedUser {
    readonly avatarUrl: string | null;
    readonly id: string;
    readonly login: string | null;
    readonly name: string | null;
}

function parseGitHubApiError(
    payload: unknown,
    status: number
): IntegrationApiError {
    const record = asProviderPayloadRecord(payload);
    const message =
        readPayloadString(record?.message) ??
        `GitHub API request failed with status ${status}.`;

    return new IntegrationApiError({
        integrationId: "github",
        message,
        operation: "fetchGitHub",
        status,
    });
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
    const record = asProviderPayloadRecord(payload);
    const numericId = readPayloadNumber(record?.id);
    if (numericId === null) {
        return null;
    }

    return {
        avatarUrl: readPayloadString(record?.avatar_url),
        id: String(numericId),
        login: readPayloadString(record?.login),
        name: readPayloadString(record?.name),
    };
}

function parseRepository(
    candidate: unknown
): GitHubImportableRepository | null {
    const record = asProviderPayloadRecord(candidate);
    const numericId = readPayloadNumber(record?.id);
    const htmlUrl = readPayloadString(record?.html_url);

    if (numericId === null || !htmlUrl) {
        return null;
    }

    const owner = asProviderPayloadRecord(record?.owner);
    const fullName = readPayloadString(record?.full_name);
    const language = readPayloadString(record?.language);
    const topics = Array.isArray(record?.topics)
        ? record.topics.filter(
              (topic): topic is string => typeof topic === "string"
          )
        : [];

    return {
        caption: readPayloadString(record?.description) ?? fullName,
        externalId: String(numericId),
        postedAt: readPayloadDate(record?.updated_at),
        sourceMetadata: {
            github: {
                defaultBranch: readPayloadString(record?.default_branch),
                fork: Boolean(record?.fork),
                fullName,
                importTimestamp: new Date().toISOString(),
                language,
                owner: {
                    avatarUrl: readPayloadString(owner?.avatar_url),
                    id: readPayloadNumber(owner?.id),
                    login: readPayloadString(owner?.login),
                },
                private: Boolean(record?.private),
                stargazersCount: readPayloadNumber(record?.stargazers_count),
                topics,
            },
        },
        thumbnailUrl: readPayloadString(owner?.avatar_url),
        url: htmlUrl,
    };
}

export async function getGitHubAuthenticatedUser(
    accessToken: string
): Promise<GitHubAuthenticatedUser> {
    const payload = await fetchGitHub(accessToken, "/user");
    const user = parseAuthenticatedUser(payload);

    if (!user) {
        throw new IntegrationApiError({
            integrationId: "github",
            message: "GitHub did not return a valid user.",
            operation: "getGitHubAuthenticatedUser",
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
