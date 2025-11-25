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

Deno.test("Application: single semantic match is returned", async () => {
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
    assertEquals(queryRecord.resultItems?.length ?? 0, 1);

    const onlyResult = storedConnections.find((conn) =>
      conn._id === queryRecord.resultItems?.[0]
    );
    assertExists(onlyResult, "indexed LinkedIn connection should be returned");
    assertEquals(
      onlyResult.summary?.includes(semanticToken),
      true,
      "semantic token should match the returned profile",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Application: multiple semantic matches are returned", async () => {
  const [db, client] = await testDb();
  const linkedInConcept = new LinkedInImportConcept(db);
  const semanticConcept = new SemanticSearchConcept(db);
  const owner = "user:semantic-search" as ID;

  try {
    const accountResult = await linkedInConcept.connectLinkedInAccount({
      user: owner,
      accessToken: "token",
      linkedInUserId: "linkedin-owner-456",
    });
    if ("error" in accountResult) {
      throw new Error(
        `Failed to create LinkedIn account: ${accountResult.error}`,
      );
    }

    const account = accountResult.account;
    const seededConnections = [
      {
        linkedInConnectionId: "conn-semantic-lead",
        firstName: "Noah",
        lastName: "Rivera",
        headline: "Principal Retrieval Engineer",
        location: "Seattle",
        currentCompany: "Embeddings Co",
        summary:
          "Owns semantic relevance tuning, semantic embeddings, and vector retrieval infrastructure.",
        skills: ["semantic search", "retrieval", "python"],
      },
      {
        linkedInConnectionId: "conn-semantic-ml",
        firstName: "Alana",
        lastName: "Grewal",
        headline: "Lead Vector Database Engineer",
        location: "Boston",
        currentCompany: "Graph IQ",
        summary:
          "Builds vector databases, semantic ranking models, and embeddings evaluators.",
        skills: ["vector database", "semantic", "rust"],
      },
      {
        linkedInConnectionId: "conn-nonmatch",
        firstName: "Theo",
        lastName: "Miles",
        headline: "Product Designer",
        location: "Denver",
        currentCompany: "Interface Lab",
        summary: "Focuses on UI prototyping and design systems.",
        skills: ["design", "figma", "ux"],
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
      queryText: "semantic embeddings vector engineer",
    });

    const queryRecord = await semanticConcept.searchQueries.findOne({
      _id: queryID,
    });
    assertExists(queryRecord, "query result should be stored");
    assertEquals(Array.isArray(queryRecord.resultItems), true);

    const expectedIds = new Set([
      "conn-semantic-lead",
      "conn-semantic-ml",
    ]);
    const matchingConnections = storedConnections.filter((conn) =>
      expectedIds.has(conn.linkedInConnectionId ?? "")
    );
    assertEquals(matchingConnections.length, 2);

    const resultItems = queryRecord.resultItems ?? [];
    for (const match of matchingConnections) {
      assertEquals(
        resultItems.includes(match._id),
        true,
        `semantic match ${match.linkedInConnectionId} should appear in results`,
      );
    }

    const distractor = storedConnections.find((conn) =>
      conn.linkedInConnectionId === "conn-nonmatch"
    );
    assertExists(distractor);

    const matchRanks = matchingConnections.map((conn) =>
      resultItems.indexOf(conn._id)
    );
    const highestMatchRank = Math.max(...matchRanks);
    const distractorRank = resultItems.indexOf(distractor._id);

    if (distractorRank !== -1) {
      assertEquals(
        distractorRank > highestMatchRank,
        true,
        "semantic matches should rank ahead of the distractor",
      );
    }
  } finally {
    await client.close();
  }
});

Deno.test("Application: semantic ranking prioritizes the closest match", async () => {
  const [db, client] = await testDb();
  const linkedInConcept = new LinkedInImportConcept(db);
  const semanticConcept = new SemanticSearchConcept(db);
  const owner = "user:semantic-search" as ID;

  try {
    const accountResult = await linkedInConcept.connectLinkedInAccount({
      user: owner,
      accessToken: "token",
      linkedInUserId: "linkedin-owner-789",
    });
    if ("error" in accountResult) {
      throw new Error(
        `Failed to create LinkedIn account: ${accountResult.error}`,
      );
    }

    const account = accountResult.account;
    const primaryMatchId = "conn-ranking-strong";
    const secondaryMatchId = "conn-ranking-weak";
    const seededConnections = [
      {
        linkedInConnectionId: primaryMatchId,
        firstName: "Priya",
        lastName: "Talwar",
        headline: "Staff Semantic Retrieval Engineer",
        location: "Chicago",
        currentCompany: "Signal Mesh",
        summary:
          "Architects distributed semantic retrieval, vector databases, and embeddings ranking systems for knowledge graphs.",
        skills: [
          "semantic retrieval",
          "vector database",
          "distributed systems",
          "knowledge graphs",
        ],
      },
      {
        linkedInConnectionId: secondaryMatchId,
        firstName: "Leo",
        lastName: "Martinez",
        headline: "Machine Learning Engineer",
        location: "Toronto",
        currentCompany: "Relevance Labs",
        summary:
          "Builds ML services and occasionally supports semantic search projects.",
        skills: ["machine learning", "semantic search"],
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
      queryText:
        "distributed semantic retrieval engineer vector database knowledge graph",
    });

    const queryRecord = await semanticConcept.searchQueries.findOne({
      _id: queryID,
    });
    assertExists(queryRecord, "query result should be stored");
    const resultItems = queryRecord.resultItems ?? [];
    assertEquals(resultItems.length >= 2, true);

    const strongMatch = storedConnections.find((conn) =>
      conn.linkedInConnectionId === primaryMatchId
    );
    const weakMatch = storedConnections.find((conn) =>
      conn.linkedInConnectionId === secondaryMatchId
    );
    assertExists(strongMatch);
    assertExists(weakMatch);

    const strongRank = resultItems.indexOf(strongMatch._id);
    const weakRank = resultItems.indexOf(weakMatch._id);
    assertEquals(strongRank !== -1 && weakRank !== -1, true);
    assertEquals(
      strongRank < weakRank,
      true,
      "the stronger semantic match should rank ahead of the weaker match",
    );
  } finally {
    await client.close();
  }
});
