import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LinkedInImportConcept from "./LinkedInImportConcept.ts";
import MultiSourceNetworkConcept from "../MultiSourceNetwork/MultiSourceNetworkConcept.ts";

Deno.test("Integration: LinkedIn import creates canonical node in MultiSourceNetwork via sync", async () => {
  const [db, client] = await testDb();
  const linkedin = new LinkedInImportConcept(db);
  const network = new MultiSourceNetworkConcept(db);

  try {
    const owner = "owner:IntegrationTest" as ID;

    // 1) create network for owner (ensures owner membership exists)
    await network.createNetwork({ owner });

    // 2) connect a LinkedIn account for the user
    const connectRes = await linkedin.connectLinkedInAccount({
      user: owner,
      accessToken: "fake-token",
      linkedInUserId: "li-user-123",
      linkedInName: "Integration Tester",
    });
    if ("error" in connectRes) throw new Error(connectRes.error);
    const account = connectRes.account as ID;

    // 3) add a connection (this mimics the importer storing a connection)
    const connRes = await linkedin.addConnection({
      account,
      linkedInConnectionId: "li-conn-xyz",
      firstName: "Import",
      lastName: "User",
      headline: "QA Engineer",
      profileUrl: "https://linkedin/in/import-user",
      rawData: { example: true },
    });
    if ("error" in connRes) throw new Error(connRes.error);
    const connectionId = connRes.connection as ID;

    // 4) simulate the sync: call addOrMigrateNodeFromSource to create/migrate canonical node
    const migrateRes = await network.addOrMigrateNodeFromSource({
      owner,
      legacyNodeId: connectionId,
      source: "linkedin" as ID,
      nodeMeta: {
        firstName: "Import",
        lastName: "User",
        label: "Import User",
        headline: "QA Engineer",
        profileUrl: "https://linkedin/in/import-user",
      },
      externalId: "li-conn-xyz",
    });
    // addOrMigrateNodeFromSource throws on error, and returns { node }
    const nodeId = migrateRes.node as ID;

    // 5) verify the node exists in nodes collection
    const nodeDoc = await network.nodes.findOne({ _id: nodeId });
    assertExists(nodeDoc, "Canonical node should have been created");
    assertEquals(nodeDoc?.firstName, "Import");
    assertEquals(nodeDoc?.lastName, "User");

    // 6) verify membership exists for owner -> node
    const membership = await network.memberships.findOne({
      owner,
      node: nodeId,
    });
    assertExists(
      membership,
      "Membership for owner -> node should exist after migration",
    );

    // 7) verify search returns the node for the owner
    const search = await network.searchNodes({ owner, query: "Import" });
    assertEquals(search.total > 0, true);
    const found = search.results.some((r) =>
      (r._id as ID) === nodeId || r.label === "Import User"
    );
    assertEquals(
      found,
      true,
      "Search should return the migrated canonical node",
    );
  } finally {
    await client.close();
  }
});
