import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

export const db = process.env.DATABASE_URL
  ? drizzle(
      new pg.Pool({ connectionString: process.env.DATABASE_URL }),
      { schema }
    )
  : undefined;
