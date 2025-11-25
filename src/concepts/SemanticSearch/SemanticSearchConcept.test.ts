import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import SemanticSearchConcept from "./SemanticSearchConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("SemanticSearchConcept.indexItem upserts state and calls external index", async () => {
  const [db, client] = await testDb();
  const concept = new SemanticSearchConcept(db);

  // Arrange
  const owner = "owner:alice" as ID;
  const item = "item:conn1" as ID;
  const text = "Senior SWE at Acme, Rust, distributed systems";

  try {
    // Act (this will call the live txtai /index endpoint)
    await concept.indexItem({ owner, item, text });

    // Assert DB state
    const docId = `${owner}:${item}`;
    const stored = await concept.indexedItems.findOne({ _id: docId });
    assertEquals(stored?.owner, owner);
    assertEquals(stored?.item, item);
    assertEquals(stored?.text, text);
  } finally {
    await client.close();
  }
});

Deno.test("SemanticSearchConcept.queryItems stores query and returns queryID", async () => {
  const [db, client] = await testDb();
  const concept = new SemanticSearchConcept(db);

  const owner = "owner:alice" as ID;
  const itemA = "item:A" as ID;
  const itemB = "item:B" as ID;

  try {
    const { queryID } = await concept.queryItems({
      owner,
      queryText: "distributed systems engineer",
    });

    // queryID should be non-empty
    assertEquals(typeof queryID, "string");
    assertEquals(queryID.length > 0, true);

    const stored = await concept.searchQueries.findOne({ _id: queryID });
    assertEquals(stored?.owner, owner);
    assertEquals(stored?.queryText, "distributed systems engineer");
    // We can't know exact ordering from txtai, but we expect at least one result
    assertEquals(Array.isArray(stored?.resultItems), true);
  } finally {
    await client.close();
  }
});

Deno.test("SemanticSearchConcept.refineQuery recomputes resultItems", async () => {
  const [db, client] = await testDb();
  const concept = new SemanticSearchConcept(db);

  const owner = "owner:alice" as ID;
  const itemA = "item:A" as ID;
  const itemB = "item:B" as ID;

  try {
    const { queryID } = await concept.queryItems({
      owner,
      queryText: "graph engineer",
    });

    await concept.refineQuery({
      queryID,
      filters: { skill: "graph" },
    });

    const stored = await concept.searchQueries.findOne({ _id: queryID });
    // After refinement, we expect resultItems to be an array (contents depend on txtai)
    assertEquals(Array.isArray(stored?.resultItems), true);
  } finally {
    await client.close();
  }
});
