import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LinkedInImportConcept from "../LinkedInImport/LinkedInImportConcept.ts";
import SemanticSearchConcept from "./SemanticSearchConcept.ts";

interface ConnectionLike {
  _id: ID;
  firstName?: string;
  lastName?: string;
  headline?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  currentPosition?: string;
  currentCompany?: string;
}

function buildConnectionText(conn: ConnectionLike): string {
  const name = `${conn.firstName ?? ""} ${conn.lastName ?? ""}`.trim();
  const role = conn.headline ?? conn.currentPosition ?? "";
  const company = conn.currentCompany ? ` at ${conn.currentCompany}` : "";
  const location = conn.location ? `. Based in ${conn.location}` : "";
  const skills = conn.skills?.length
    ? `. Skills: ${conn.skills.join(", ")}`
    : "";
  const summary = conn.summary ? `. Summary: ${conn.summary}` : "";
  const pieces = [name, role + company, location, skills, summary].filter((
    part,
  ) => part && part.trim().length > 0);
  return pieces.join(" ").trim();
}

Deno.test("Application: LinkedIn connections can be indexed and searched semantically", async () => {
  // Requires txtai running at SEMANTIC_SERVICE_URL (defaults to http://localhost:8001).
  const [db, client] = await testDb();
  const linkedInConcept = new LinkedInImportConcept(db);
  const semanticConcept = new SemanticSearchConcept(db);
  const owner = "user:semantic-search" as ID;
  const semanticToken = "semantic-benchmark-token";

  try {
    const accountResult = await linkedInConcept.connectLinkedInAccount({
      user: owner,
      accessToken: "token",
      linkedInUserId: "linkedin-owner-123",
    });
    if ("error" in accountResult) {
      throw new Error(
        `Failed to create LinkedIn account: ${accountResult.error}`,
      );
    }

    const account = accountResult.account;

    const seededConnections = [
      {
        linkedInConnectionId: "conn-search-ml",
        firstName: "Maya",
        lastName: "Chen",
        headline: "Senior Semantic Search Engineer",
        location: "San Francisco",
        currentCompany: "Vector Labs",
        summary:
          `Leads distributed semantic retrieval and embeddings research for enterprise search. ${semanticToken}.`,
        skills: ["semantic search", "vector databases", "Rust", "Python"],
      },
    ];

    for (const seed of seededConnections) {
      const addResult = await linkedInConcept.addConnection({
        account,
        ...seed,
      });
      if ("error" in addResult) {
        throw new Error(
          `Failed to add connection ${seed.linkedInConnectionId}: ${addResult.error}`,
        );
      }
    }

    const storedConnections = await linkedInConcept._getConnections({
      account,
    });
    assertEquals(storedConnections.length, seededConnections.length);

    for (const conn of storedConnections) {
      const text = buildConnectionText(conn);
      await semanticConcept.indexItem({
        owner,
        item: conn._id,
        text,
      });
    }

    const { queryID } = await semanticConcept.queryItems({
      owner,
      queryText: `${semanticToken} embeddings engineer`,
    });

    assertEquals(typeof queryID, "string");
    const queryRecord = await semanticConcept.searchQueries.findOne({
      _id: queryID,
    });
    assertExists(queryRecord, "query result should be stored");
    assertEquals(queryRecord.owner, owner);
    assertEquals(Array.isArray(queryRecord.resultItems), true);

    const matchedConnections = (queryRecord.resultItems ?? [])
      .map((id) => storedConnections.find((conn) => conn._id === id))
      .filter((conn) => Boolean(conn));
    assertEquals(
      matchedConnections.length > 0,
      true,
      "semantic query should return seeded connections",
    );
    const tokenHit = matchedConnections.some((conn) =>
      conn!.summary?.includes(semanticToken)
    );
    assertEquals(
      tokenHit,
      true,
      "semantic token should appear in at least one matched connection",
    );
  } finally {
    await client.close();
  }
});
