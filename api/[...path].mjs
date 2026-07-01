import { handleNodeRequest } from "../server.mjs";

export default function handler(req, res) {
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return handleNodeRequest(req, res);
}
