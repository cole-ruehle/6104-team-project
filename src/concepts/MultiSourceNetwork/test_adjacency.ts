/**
 * Test script for _getAdjacencyArray
 * Tests Alice's network with Bob as a connected node
 */

import { getDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MultiSourceNetworkConcept from "./MultiSourceNetworkConcept.ts";

// Get user IDs from command line arguments or use defaults
// Usage: deno run --allow-net --allow-env --allow-read test_adjacency.ts <aliceId> <bobId>
const aliceId = (Deno.args[0] || "alice") as ID; // Replace with actual Alice user ID
const bobId = (Deno.args[1] || "bob") as ID; // Replace with actual Bob user ID
const source = "manual" as ID;

console.log(`Using Alice ID: ${aliceId}`);
console.log(`Using Bob ID: ${bobId}\n`);

async function testAdjacencyArray() {
  console.log("=== Testing _getAdjacencyArray ===\n");

  const [db, client] = await getDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    // Step 1: Create network for Alice (with Alice as root)
    console.log("1. Creating network for Alice...");
    const createResult = await network.createNetwork({
      owner: aliceId,
      root: aliceId, // Alice is the root
    });

    if ("error" in createResult) {
      if (createResult.error?.includes("already exists")) {
        console.log("   Network already exists, continuing...");
      } else {
        console.error("   Error creating network:", createResult.error);
        return;
      }
    } else {
      console.log("   ✓ Network created successfully");
    }

    // Step 2: Add Bob to Alice's network membership
    console.log("\n2. Adding Bob to Alice's network membership...");
    const addBobResult = await network.addNodeToNetwork({
      owner: aliceId,
      node: bobId,
      source: source,
    });

    if ("error" in addBobResult) {
      console.error("   Error adding Bob:", addBobResult.error);
      return;
    } else {
      console.log("   ✓ Bob added to membership");
    }

    // Step 3: Add edge from Alice to Bob
    console.log("\n3. Adding edge from Alice to Bob...");
    const addEdgeResult = await network.addEdge({
      owner: aliceId,
      from: aliceId,
      to: bobId,
      source: source,
      weight: 1,
    });

    if ("error" in addEdgeResult) {
      console.error("   Error adding edge:", addEdgeResult.error);
      return;
    } else {
      console.log("   ✓ Edge added from Alice to Bob");
    }

    // Step 4: Get adjacency array for Alice
    console.log("\n4. Getting adjacency array for Alice...");
    const adjacency = await network._getAdjacencyArray({ owner: aliceId });

    console.log("\n=== Results ===");
    console.log("Adjacency Array for Alice:");
    console.log(JSON.stringify(adjacency, null, 2));

    console.log("\n=== Summary ===");
    const nodeCount = Object.keys(adjacency).length;
    console.log(`Total nodes in Alice's network: ${nodeCount}`);

    for (const [nodeId, edges] of Object.entries(adjacency)) {
      const nodeName = nodeId === aliceId ? "Alice" : nodeId === bobId ? "Bob" : nodeId;
      console.log(`\n${nodeName} (${nodeId}):`);
      if (edges.length === 0) {
        console.log("  → No outgoing connections");
      } else {
        edges.forEach((edge) => {
          const targetName = edge.to === aliceId ? "Alice" : edge.to === bobId ? "Bob" : edge.to;
          console.log(`  → Connected to ${targetName} (${edge.to})`);
          console.log(`    Source: ${edge.source}`);
          if (edge.weight) {
            console.log(`    Weight: ${edge.weight}`);
          }
        });
      }
    }

    // Verify Alice is connected to Bob
    const aliceConnections = adjacency[aliceId] || [];
    const connectedToBob = aliceConnections.some((edge) => edge.to === bobId);

    console.log("\n=== Verification ===");
    if (connectedToBob) {
      console.log("✓ SUCCESS: Alice is connected to Bob!");
    } else {
      console.log("✗ FAILED: Alice is NOT connected to Bob");
      console.log("  Alice's connections:", aliceConnections);
    }

    // Check if both nodes are in the adjacency list
    const hasAlice = aliceId in adjacency;
    const hasBob = bobId in adjacency;

    console.log(`\nNodes in adjacency list:`);
    console.log(`  Alice: ${hasAlice ? "✓" : "✗"}`);
    console.log(`  Bob: ${hasBob ? "✓" : "✗"}`);

  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    await client.close();
    console.log("\n=== Test Complete ===");
  }
}

// Run the test
if (import.meta.main) {
  await testAdjacencyArray();
}
