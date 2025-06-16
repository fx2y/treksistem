import { env } from "$env/dynamic/public";

export const PUBLIC_API_URL = env.PUBLIC_API_URL || "http://localhost:8787";
