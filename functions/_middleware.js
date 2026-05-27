export async function onRequest(context) {
  const response = await context.next();
  const headers = new Headers(response.headers);
  const { pathname } = new URL(context.request.url);

  if (pathname.startsWith("/elecciones-2026/")) {
    headers.set("cache-control", "no-store, must-revalidate");
  } else if (pathname.startsWith("/data/") && pathname.endsWith(".json")) {
    headers.set("cache-control", "public, max-age=300, must-revalidate");
    headers.set("access-control-allow-origin", "*");
  } else if (pathname.startsWith("/logos/") || pathname.startsWith("/assets/")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  } else if (pathname.startsWith("/blog/admin/")) {
    headers.set("x-robots-tag", "noindex");
    headers.set("cache-control", "no-store");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
