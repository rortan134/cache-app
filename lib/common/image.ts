/**
 * Tests if an image URL returns a successful response.
 * Useful for filtering out thumbnails that return 403 Forbidden or 404 Not Found.
 */
export async function testValidImageResponse(url: string): Promise<boolean> {
    try {
        // We use fetch to test the response status directly.
        const response = await fetch(url, { method: "HEAD" });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Filters an array of image URLs, returning only those that respond successfully.
 */
export async function filterValidImageUrls(urls: string[]): Promise<string[]> {
    const results = await Promise.all(
        urls.map(async (url) => {
            const isValid = await testValidImageResponse(url);
            return isValid ? url : null;
        })
    );
    return results.filter((url): url is string => url !== null);
}
