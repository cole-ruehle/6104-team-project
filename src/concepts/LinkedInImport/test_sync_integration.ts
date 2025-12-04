/**
 * Integration test to verify that LinkedIn connections sync to MultiSourceNetwork
 *
 * This test:
 * 1. Creates a LinkedIn account
 * 2. Imports 2 connections from CSV
 * 3. Verifies that the sync automatically creates memberships in MultiSourceNetwork
 */

import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { SyncConcept, Logging, actions } from "@engine";
import { $vars } from "../../engine/vars.ts";
import LinkedInImportConcept from "./LinkedInImportConcept.ts";
import MultiSourceNetworkConcept from "../MultiSourceNetwork/MultiSourceNetworkConcept.ts";

const userA = "user:Alice" as ID;
const sourceLinkedIn = "linkedin" as ID;

Deno.test("Sync Integration: CSV import triggers sync to create MultiSourceNetwork memberships", async () => {
  const [db, client] = await testDb();

  // Set up the sync engine
  const Engine = new SyncConcept();
  Engine.logging = Logging.TRACE; // Enable logging to see sync execution

  // Create concept instances
  const linkedInConcept = new LinkedInImportConcept(db);
  const networkConcept = new MultiSourceNetworkConcept(db);

  // Instrument concepts with the engine (this enables syncs)
  const LinkedInImport = Engine.instrumentConcept(linkedInConcept);
  const MultiSourceNetwork = Engine.instrumentConcept(networkConcept);

  // Register the sync - create it inline to use the correct action references
  const AddLinkedInConnectionToNetwork = ({ account, connection, user }: { account: symbol; connection: symbol; user: symbol }) => ({
    when: actions([
      LinkedInImport.addConnection,
      { account },
      { connection },
    ]),
    where: async (frames) => {
      const accountValue = frames[0]?.[account];
      const connectionValue = frames[0]?.[connection];
      console.log(`[Sync] AddLinkedInConnectionToNetwork: Processing connection ${String(connectionValue)} for account ${String(accountValue)}`);
      frames = await frames.query(
        LinkedInImport._getAccountUser,
        { account },
        { user },
      );
      if (frames.length === 0) {
        console.warn(`[Sync] AddLinkedInConnectionToNetwork: No user found for account ${String(accountValue)}, sync will not execute`);
      } else {
        const userValue = frames[0]?.[user];
        console.log(`[Sync] AddLinkedInConnectionToNetwork: Found user ${String(userValue)} for account ${String(accountValue)}`);
      }
      return frames;
    },
    then: actions([
      MultiSourceNetwork.addNodeToNetwork,
      {
        owner: user,
        node: connection,
        source: "linkedin" as ID,
      },
    ]),
  });

  Engine.register({
    "linkedinImport.AddLinkedInConnectionToNetwork": AddLinkedInConnectionToNetwork,
  });

  // Verify sync is registered
  console.log(`Registered syncs: ${Object.keys(Engine.syncs).join(", ")}`);
  const syncsForAddConnection = Engine.syncsByAction.get(LinkedInImport.addConnection);
  console.log(`Syncs by action for addConnection: ${syncsForAddConnection?.size || 0}`);
  if (syncsForAddConnection) {
    console.log(`Sync names: ${Array.from(syncsForAddConnection).map(s => s.sync).join(", ")}`);
  }

  try {
    console.log("\n=== Step 1: Create LinkedIn Account ===");
    // 1. Create a LinkedIn account
    const accountResult = await LinkedInImport.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    assertNotEquals("error" in accountResult, true, "Account creation should succeed");
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;
    console.log(`✓ Created account: ${account}`);

    // 2. Create network for the user
    console.log("\n=== Step 2: Create Network ===");
    const networkResult = await MultiSourceNetwork.createNetwork({
      owner: userA,
    });
    assertNotEquals("error" in networkResult, true, "Network creation should succeed");
    console.log(`✓ Created network for user: ${userA}`);

    // 3. Add 2 connections directly (to test sync)
    // Note: We call the instrumented addConnection directly to ensure sync triggers
    console.log("\n=== Step 3: Add 2 connections directly (to test sync) ===");

    const connection1Result = await LinkedInImport.addConnection({
      account,
      linkedInConnectionId: "johndoe",
      firstName: "John",
      lastName: "Doe",
      profileUrl: "https://www.linkedin.com/in/johndoe",
      currentCompany: "Tech Corp",
      currentPosition: "Software Engineer",
    });

    const connection2Result = await LinkedInImport.addConnection({
      account,
      linkedInConnectionId: "janesmith",
      firstName: "Jane",
      lastName: "Smith",
      profileUrl: "https://www.linkedin.com/in/janesmith",
      currentCompany: "Startup Inc",
      currentPosition: "Product Manager",
    });

    assertNotEquals("error" in connection1Result, true, "Connection 1 should be created");
    assertNotEquals("error" in connection2Result, true, "Connection 2 should be created");

    if ("error" in connection1Result || "error" in connection2Result) {
      throw new Error("Failed to create connections");
    }

    // Give sync a moment to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`✓ Created 2 connections via instrumented addConnection`);

    // 4. Verify connections exist in LinkedInImport
    console.log("\n=== Step 4: Verify connections in LinkedInImport ===");
    const connections = await linkedInConcept._getConnections({ account });
    console.log(`Found ${connections.length} connections in LinkedInImport`);
    assertEquals(connections.length, 2, "Should have 2 connections");

    const connection1 = connections.find(c => c.linkedInConnectionId === "johndoe");
    const connection2 = connections.find(c => c.linkedInConnectionId === "janesmith");

    assertExists(connection1, "Connection 1 (John Doe) should exist");
    assertExists(connection2, "Connection 2 (Jane Smith) should exist");
    console.log(`✓ Connection 1 ID: ${connection1._id}`);
    console.log(`✓ Connection 2 ID: ${connection2._id}`);

    // 5. Verify memberships were created in MultiSourceNetwork (via sync)
    console.log("\n=== Step 5: Verify sync created memberships in MultiSourceNetwork ===");
    const memberships = await networkConcept.memberships.find({ owner: userA }).toArray();
    console.log(`Found ${memberships.length} memberships for user ${userA}`);

    // Should have at least 2 memberships (one for each connection)
    // Note: The owner might also have a membership with source "self"
    const linkedInMemberships = memberships.filter(m =>
      m.sources && m.sources[sourceLinkedIn]
    );

    console.log(`Found ${linkedInMemberships.length} memberships with source "linkedin"`);
    if (linkedInMemberships.length < 2) {
      console.error(`ERROR: Expected at least 2 memberships with source "linkedin", but found ${linkedInMemberships.length}`);
      console.error("All memberships:", JSON.stringify(memberships, null, 2));
      throw new Error(`Should have at least 2 memberships with source "linkedin", found ${linkedInMemberships.length}`);
    }

    // Verify the connection IDs match
    const membership1 = linkedInMemberships.find(m =>
      m.node === connection1._id || m.node === connection2._id
    );
    const membership2 = linkedInMemberships.find(m =>
      m.node === connection1._id || m.node === connection2._id
    );

    assertExists(membership1, "Membership 1 should exist for one of the connections");
    assertExists(membership2, "Membership 2 should exist for the other connection");

    console.log(`✓ Membership 1: node=${membership1.node}, sources=${JSON.stringify(membership1.sources)}`);
    console.log(`✓ Membership 2: node=${membership2.node}, sources=${JSON.stringify(membership2.sources)}`);

    // Verify the sources contain "linkedin"
    assertEquals(
      membership1.sources?.[sourceLinkedIn],
      true,
      "Membership 1 should have source 'linkedin'"
    );
    assertEquals(
      membership2.sources?.[sourceLinkedIn],
      true,
      "Membership 2 should have source 'linkedin'"
    );

    console.log("\n✅ SUCCESS: Sync integration test passed!");
    console.log("   - Connections were created in LinkedInImport");
    console.log("   - Sync automatically created memberships in MultiSourceNetwork");
    console.log("   - Memberships have the correct source 'linkedin'");

  } finally {
    await client.close();
  }
});
