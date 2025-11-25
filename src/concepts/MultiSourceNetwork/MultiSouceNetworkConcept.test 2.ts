import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MultiSourceNetworkConcept from "./MultiSourceNetworkConcept.ts";

const ownerA = "owner:Alice" as ID;
const nodeB = "node:Bob" as ID;
const nodeC = "node:Charlie" as ID;
const nodeD = "node:Dave" as ID;
const source1 = "source:1" as ID;
const source2 = "source:2" as ID;

Deno.test("Principle: Owner creates network, adds nodes and edges, adjacency forms correctly", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    // 1. Create network
    const createResult = await network.createNetwork({ owner: ownerA });
    assertNotEquals(
      "error" in createResult,
      true,
      "Network creation should succeed.",
    );

    // 2. Add nodes
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeC,
      source: source2,
    });

    // 3. Verify memberships exist
    const membershipB = await network.memberships.findOne({
      owner: ownerA,
      node: nodeB,
    });
    assertExists(membershipB, "NodeB should exist in memberships.");

    const membershipC = await network.memberships.findOne({
      owner: ownerA,
      node: nodeC,
    });
    assertExists(membershipC, "NodeC should exist in memberships.");

    // 4. Add edge from B to C
    await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeC,
      source: source1,
      weight: 5,
    });

    const edges = await network.edges.find({ owner: ownerA }).toArray();
    assertEquals(edges.length, 1, "There should be one edge in the network.");
    assertEquals(edges[0].from, nodeB);
    assertEquals(edges[0].to, nodeC);
    assertEquals(edges[0].weight, 5);

    // 5. Form adjacency array
    const adjacency = await network._getAdjacencyArray(ownerA);
    assertEquals(
      adjacency[nodeB].length,
      1,
      "NodeB should have one outgoing edge.",
    );
    assertEquals(adjacency[nodeB][0].to, nodeC, "Edge should point to NodeC.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: Adding the same node with multiple sources updates sources array", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source2,
    });

    const membershipB = await network.memberships.findOne({
      owner: ownerA,
      node: nodeB,
    });
    assertEquals(
      Object.keys(membershipB?.sources || {}).length,
      2,
      "NodeB should have two sources.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: Removing node with one source leaves node if other sources exist", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source2,
    });

    await network.removeNodeFromNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });

    const membershipB = await network.memberships.findOne({
      owner: ownerA,
      node: nodeB,
    });
    assertExists(
      membershipB,
      "NodeB should still exist since it has another source.",
    );
    assertEquals(
      Object.keys(membershipB?.sources || {}).length,
      1,
      "NodeB should have only one remaining source.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: Removing node with no sources deletes node and edges", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeC,
      source: source1,
    });
    await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeC,
      source: source1,
    });

    await network.removeNodeFromNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });

    const membershipB = await network.memberships.findOne({
      owner: ownerA,
      node: nodeB,
    });
    assertEquals(membershipB, null, "NodeB should be deleted.");

    const edges = await network.edges.find({ owner: ownerA }).toArray();
    assertEquals(
      edges.length,
      0,
      "All edges involving NodeB should be deleted.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Edge case: Cannot add edge from node to itself", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });

    const result = await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeB,
      source: source1,
    });
    assertEquals("error" in result, true, "Adding self-edge should fail.");
  } finally {
    await client.close();
  }
});

Deno.test("Edge case: Removing non-existent node returns error", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    const result = await network.removeNodeFromNetwork({
      owner: ownerA,
      node: "node:fake" as ID,
    });
    assertEquals(
      "error" in result,
      true,
      "Removing a node that does not exist should fail.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Integration: Add multiple nodes and edges, remove sources, check adjacency", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeC,
      source: source1,
    });
    await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeC,
      source: source1,
      weight: 2,
    });

    await network.removeNodeFromNetwork({
      owner: ownerA,
      node: nodeC,
      source: source1,
    });

    const adjacency = await network._getAdjacencyArray(ownerA);
    assertEquals(
      adjacency[nodeB]?.length,
      0,
      "Edges to removed node should no longer appear.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("DEBUG: Print adjacency array", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    console.log("\n=== Debug adjacency example ===");

    await network.createNetwork({ owner: ownerA });

    // Add nodes from different sources
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeC,
      source: source2,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeD,
      source: source1,
    });

    // Add edges
    await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeC,
      source: source1,
      weight: 5,
    });
    await network.addEdge({
      owner: ownerA,
      from: nodeC,
      to: nodeD,
      source: source2,
      weight: 3,
    });
    await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeD,
      source: source2,
    });

    // Get adjacency
    const adjacency = await network._getAdjacencyArray(ownerA);

    // Pretty-print adjacency
    console.log("Adjacency Array:");
    console.log(JSON.stringify(adjacency, null, 2));

    console.log("=== End adjacency ===\n");
  } finally {
    await client.close();
  }
});
