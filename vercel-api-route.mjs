import { handleNodeRequest } from "./server.mjs";

export function createVercelApiRoute(routePath) {
  return function handler(req, res) {
    const originalUrl = req.url || "";
    const query = originalUrl.includes("?") ? originalUrl.slice(originalUrl.indexOf("?")) : "";
    req.url = `${routePath}${query}`;
    return handleNodeRequest(req, res);
  };
}
