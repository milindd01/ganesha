const NOT_FOUND = 404;

function shouldServeAppShell(pathname) {
  return pathname === "/" || pathname === "/index.html";
}

async function fetchAsset(request, env, pathname) {
  return env.ASSETS.fetch(new Request(new URL(pathname, request.url), request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname || "/";

    if (shouldServeAppShell(pathname)) {
      return fetchAsset(request, env, "/index.html");
    }

    const assetResponse = await fetchAsset(request, env, pathname);
    if (assetResponse.status !== NOT_FOUND) {
      return assetResponse;
    }

    if (!pathname.includes(".")) {
      return fetchAsset(request, env, "/index.html");
    }

    return assetResponse;
  },
};
