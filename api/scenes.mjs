import { createVercelApiRoute } from "../vercel-api-route.mjs";

export const config = {
  maxDuration: 60,
};

export default createVercelApiRoute("/api/scenes");
