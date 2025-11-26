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
    const adjacency = await network._getAdjacencyArray({ owner: ownerA });
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

    const adjacency = await network._getAdjacencyArray({ owner: ownerA });
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
    const adjacency = await network._getAdjacencyArray({ owner: ownerA });

    // Pretty-print adjacency
    console.log("Adjacency Array:");
    console.log(JSON.stringify(adjacency, null, 2));

    console.log("=== End adjacency ===\n");
  } finally {
    await client.close();
  }
});

Deno.test("E2E: create nodes via createNodeForUser, search by name, then create edges and verify adjacency", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  const owner = "owner:TestUser" as ID;
  try {
    // create network
    await network.createNetwork({ owner });

    // create two nodes via createNodeForUser
    const a = await network.createNodeForUser({
      owner,
      firstName: "John",
      lastName: "Smith",
      label: "John Smith",
    });
    if (a.error) throw new Error(a.error);
    const nodeA = a.node as ID;

    const b = await network.createNodeForUser({
      owner,
      firstName: "Jane",
      lastName: "Doe",
      label: "Jane Doe",
    });
    if (b.error) throw new Error(b.error);
    const nodeB = b.node as ID;

    // search for John
    const searchJ = await network.searchNodes({ owner, query: "John" });
    // Expect at least one result and that John's node is present
    assertEquals(searchJ.total > 0, true);
    const names = searchJ.results.map((r) => ({
      first: (r.firstName as string) || "",
      last: (r.lastName as string) || "",
      label: (r.label as string) || "",
    }));
    const foundJohn = names.some((n) =>
      n.first === "John" && (n.last === "Smith" || n.label.includes("John"))
    );
    assertEquals(foundJohn, true, "Search should return John Smith");

    // search for Doe
    const searchDoe = await network.searchNodes({ owner, query: "Doe" });
    assertEquals(searchDoe.total > 0, true);
    const foundJane = searchDoe.results.some((r) =>
      (r.firstName as string) === "Jane" || (r.lastName as string) === "Doe" ||
      (r.label as string).includes("Jane")
    );
    assertEquals(foundJane, true, "Search should return Jane Doe");

    // create an edge from John -> Jane
    await network.addEdge({
      owner,
      from: nodeA,
      to: nodeB,
      source: source1,
      weight: 7,
    });

    // verify edge exists
    const edges = await network.edges.find({ owner }).toArray();
    const edgeExists = edges.some((e) =>
      e.from === nodeA && e.to === nodeB && e.weight === 7
    );
    assertEquals(
      edgeExists,
      true,
      "Edge John->Jane should exist with weight 7",
    );

    // verify adjacency
    const adjacency = await network._getAdjacencyArray(owner);
    assertEquals(Array.isArray(adjacency[nodeA]), true);
    assertEquals(adjacency[nodeA][0].to, nodeB);
    assertEquals(adjacency[nodeA][0].weight, 7);
  } finally {
    await client.close();
  }
});
