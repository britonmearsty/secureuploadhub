import { defineConfig } from 'prisma/config';
/**
 * Note: dotenv is used for local development. 
 * On Vercel, variables are injected directly into the environment.
 */
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
    migrations: {
        seed: 'tsx ./prisma/seed.ts',
    },
    datasource: {
        // Fallback to an empty string to avoid crashes during generation if the env var is missing
        url: process.env.DATABASE_URL || "",
    },
});
