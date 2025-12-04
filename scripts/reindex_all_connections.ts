import { MongoClient } from "npm:mongodb";
import SemanticSearchConcept from "@concepts/SemanticSearch/SemanticSearchConcept.ts";
import type { ID } from "@utils/types.ts";
import "jsr:@std/dotenv/load";

// Simple one-off reindex script.
// Usage:
//   deno run -A scripts/reindex_all_connections.ts
//
// Expects MONGODB_URI and (optionally) MONGODB_DB_NAME env vars.

async function main() {
  const mongoUri = Deno.env.get("MONGODB_URL");
  if (!mongoUri) {
    throw new Error("MONGODB_URL is not set in .env");
  }
  const dbName = Deno.env.get("DB_NAME") ?? "FrontEnd";

  console.log(`[reindex] Connecting to Mongo at ${mongoUri}, db=${dbName}`);
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  const semantic = new SemanticSearchConcept(db);

  // Rebuild texts from current LinkedIn connections and push to txtai.
  const accountsCollection = db.collection("LinkedInImport.accounts");
  const connectionsCollection = db.collection("LinkedInImport.connections");

  const accounts = await accountsCollection.find({}).toArray();
  const accountToUser = new Map<string, ID>();
  for (const acc of accounts) {
    if (acc && acc._id && acc.user) {
      accountToUser.set(String(acc._id), acc.user as ID);
    }
  }

  const cursor = connectionsCollection.find({});
  const byOwner = new Map<ID, Array<{ item: ID; text: string }>>();

  while (await cursor.hasNext()) {
    const conn = await cursor.next();
    if (!conn) continue;
    const owner = accountToUser.get(String(conn.account));
    if (!owner) continue;

    const item = String(conn._id) as ID;
    const parts: string[] = [];
    const name = [conn.firstName, conn.lastName]
      .filter((x) => x && String(x).trim().length > 0)
      .join(" ");
    if (name) parts.push(name);

    if (conn.currentPosition || conn.currentCompany) {
      const roleCompany = [conn.currentPosition, conn.currentCompany]
        .filter((x) => x && String(x).trim().length > 0)
        .join(" at ");
      if (roleCompany) parts.push(roleCompany);
    }

    if (conn.headline && String(conn.headline).trim().length > 0) {
      parts.push(String(conn.headline).trim());
    }
    if (conn.location && String(conn.location).trim().length > 0) {
      parts.push(String(conn.location).trim());
    }
    if (conn.industry && String(conn.industry).trim().length > 0) {
      parts.push(String(conn.industry).trim());
    }
    if (conn.summary && String(conn.summary).trim().length > 0) {
      parts.push(String(conn.summary).trim());
    }
    if (Array.isArray(conn.skills) && conn.skills.length > 0) {
      parts.push(`Skills: ${conn.skills.join(", ")}`);
    }

    const text = parts.length > 0
      ? parts.join(". ")
      : String(conn.linkedInConnectionId ?? conn._id);

    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner)!.push({ item, text });
  }

  for (const [owner, items] of byOwner.entries()) {
    console.log(`[reindex] Owner ${owner}: ${items.length} connections`);
    for (const { item, text } of items) {
      await semantic.indexItem({ owner, item, text });
    }
  }

  console.log("[reindex] Done");
  await client.close();
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("[reindex] Failed:", err);
    Deno.exit(1);
  });
}
