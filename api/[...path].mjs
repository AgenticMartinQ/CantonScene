import { handleNodeRequest } from "../server.mjs";

export const config = {
  maxDuration: 60,
};

export default function handler(req, res) {
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return handleNodeRequest(req, res);
}
