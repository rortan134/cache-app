/**
 * Must match the origin where users sign in (same as NEXT_PUBLIC_APP_URL / BETTER_AUTH_URL).
 * When you deploy, set this to your production origin and add the same host to `manifest.json`
 * (`host_permissions` + `content_scripts` matches for `cache-site-bootstrap.js`).
 */
(function initCacheExtensionConfig(global) {
    global.CACHE_APP_ORIGIN = "https://cachd.app";
})(globalThis);
