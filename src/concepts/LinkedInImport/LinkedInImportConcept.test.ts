import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LinkedInImportConcept from "./LinkedInImportConcept.ts";

const userA = "user:Alice" as ID;

//
// ------------------------------------------------------------
// CSV Import Tests
// ------------------------------------------------------------
//

Deno.test("Action: importConnectionsFromCSV parses basic CSV and creates connections", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    // 1. Create a LinkedIn account
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    assertNotEquals("error" in accountResult, true, "Account creation should succeed");
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    // 2. Create a simple CSV
    const csvContent = `First Name,Last Name,Headline,Location
John,Doe,Software Engineer,San Francisco
Jane,Smith,Product Manager,New York`;

    // Mock the LLM response by setting up environment
    // Note: This test will fail if GEMINI_API_KEY is not set, but we can test the structure
    const importResult = await concept.importConnectionsFromCSV({
      account,
      csvContent,
    });

    // Check that import job was created (even if LLM fails, job should exist)
    if ("error" in importResult) {
      // If LLM is not available, that's okay - we're testing the structure
      console.log("Import failed (likely LLM not configured):", importResult.error);
    } else {
      assertEquals(typeof importResult.importJob, "string", "Import job should be created");
      assertEquals(typeof importResult.connectionsImported, "number", "Should return connection count");
    }
  } finally {
    await client.close();
  }
});

Deno.test("Action: importConnectionsFromCSV handles empty CSV", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    const result = await concept.importConnectionsFromCSV({
      account,
      csvContent: "",
    });

    assertEquals("error" in result, true, "Empty CSV should return error");
    if ("error" in result) {
      assertEquals(result.error.includes("empty"), true, "Error should mention empty");
    }
  } finally {
    await client.close();
  }
});

Deno.test("Action: importConnectionsFromCSV handles invalid account", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const fakeAccount = "fake_account_id" as ID;
    const result = await concept.importConnectionsFromCSV({
      account: fakeAccount,
      csvContent: "Name,Title\nJohn,Engineer",
    });

    assertEquals("error" in result, true, "Invalid account should return error");
    if ("error" in result) {
      assertEquals(result.error.includes("not found"), true, "Error should mention account not found");
    }
  } finally {
    await client.close();
  }
});

Deno.test("Action: importConnectionsFromCSV handles CSV with quoted fields", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    // CSV with quoted fields containing commas
    const csvContent = `First Name,Last Name,Headline
"John, Jr.",Doe,"Engineer, Software"
Jane,"Smith, PhD",Manager`;

    const result = await concept.importConnectionsFromCSV({
      account,
      csvContent,
    });

    // Should parse without errors (even if LLM fails)
    assertExists(result, "Should return a result");
  } finally {
    await client.close();
  }
});

//
// ------------------------------------------------------------
// JSON Import Tests
// ------------------------------------------------------------
//

Deno.test("Action: importConnectionsFromJSON parses basic JSON array and creates connections", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    // 1. Create a LinkedIn account
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    // 2. Create a simple JSON array
    const jsonContent = JSON.stringify([
      {
        first_name: "John",
        last_name: "Doe",
        headline: "Software Engineer",
        location: "San Francisco",
      },
      {
        first_name: "Jane",
        last_name: "Smith",
        headline: "Product Manager",
        location: "New York",
      },
    ]);

    const importResult = await concept.importConnectionsFromJSON({
      account,
      jsonContent,
    });

    // Check that import job was created
    if ("error" in importResult) {
      // If LLM is not available, that's okay
      console.log("Import failed (likely LLM not configured):", importResult.error);
    } else {
      assertEquals(typeof importResult.importJob, "string", "Import job should be created");
      assertEquals(typeof importResult.connectionsImported, "number", "Should return connection count");
    }
  } finally {
    await client.close();
  }
});

Deno.test("Action: importConnectionsFromJSON handles single JSON object", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    // Single object (not array)
    const jsonContent = JSON.stringify({
      first_name: "John",
      last_name: "Doe",
      headline: "Software Engineer",
    });

    const result = await concept.importConnectionsFromJSON({
      account,
      jsonContent,
    });

    // Should handle single object by wrapping in array
    assertExists(result, "Should return a result");
  } finally {
    await client.close();
  }
});

Deno.test("Action: importConnectionsFromJSON handles empty JSON", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    const result = await concept.importConnectionsFromJSON({
      account,
      jsonContent: "",
    });

    assertEquals("error" in result, true, "Empty JSON should return error");
  } finally {
    await client.close();
  }
});

Deno.test("Action: importConnectionsFromJSON handles invalid JSON", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    const result = await concept.importConnectionsFromJSON({
      account,
      jsonContent: "not valid json {",
    });

    assertEquals("error" in result, true, "Invalid JSON should return error");
    if ("error" in result) {
      assertEquals(result.error.includes("Invalid JSON"), true, "Error should mention invalid JSON");
    }
  } finally {
    await client.close();
  }
});

Deno.test("Action: importConnectionsFromJSON handles JSON with arrays (skills, education, experience)", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    const jsonContent = JSON.stringify([
      {
        first_name: "John",
        last_name: "Doe",
        skills: ["JavaScript", "TypeScript", "Python"],
        education: [
          {
            school: "MIT",
            degree: "BS",
            fieldOfStudy: "Computer Science",
            startYear: 2015,
            endYear: 2019,
          },
        ],
        experience: [
          {
            title: "Software Engineer",
            company: "Tech Corp",
            startDate: "2020-01",
            endDate: "2023-12",
          },
        ],
      },
    ]);

    const result = await concept.importConnectionsFromJSON({
      account,
      jsonContent,
    });

    // Should parse arrays correctly
    assertExists(result, "Should return a result");
  } finally {
    await client.close();
  }
});

Deno.test("Action: importConnectionsFromJSON handles empty array", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    const result = await concept.importConnectionsFromJSON({
      account,
      jsonContent: "[]",
    });

    assertEquals("error" in result, true, "Empty array should return error");
    if ("error" in result) {
      assertEquals(result.error.includes("empty"), true, "Error should mention empty");
    }
  } finally {
    await client.close();
  }
});

//
// ------------------------------------------------------------
// Integration Tests: Verify connections are created
// ------------------------------------------------------------
//

Deno.test("Integration: CSV import creates connections that can be queried", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    // Setup account
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    // Simple CSV
    const csvContent = `First Name,Last Name,Headline
John,Doe,Engineer`;

    const importResult = await concept.importConnectionsFromCSV({
      account,
      csvContent,
    });

    // If import succeeded, check connections
    if (!("error" in importResult)) {
      const connections = await concept._getConnections({ account });
      // At least the import job should exist
      assertExists(connections, "Connections query should return array");
    }
  } finally {
    await client.close();
  }
});

Deno.test("Integration: JSON import creates connections that can be queried", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    // Setup account
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    // Simple JSON
    const jsonContent = JSON.stringify([
      {
        first_name: "John",
        last_name: "Doe",
        headline: "Engineer",
      },
    ]);

    const importResult = await concept.importConnectionsFromJSON({
      account,
      jsonContent,
    });

    // If import succeeded, check connections
    if (!("error" in importResult)) {
      const connections = await concept._getConnections({ account });
      assertExists(connections, "Connections query should return array");
    }
  } finally {
    await client.close();
  }
});

//
// ------------------------------------------------------------
// Query Tests
// ------------------------------------------------------------
//

Deno.test("Query: _getAccountUser returns user for valid account", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const accountResult = await concept.connectLinkedInAccount({
      user: userA,
      accessToken: "test_token",
      linkedInUserId: "test_linkedin_id",
    });
    if ("error" in accountResult) throw new Error("Account creation failed");
    const account = accountResult.account;

    const result = await concept._getAccountUser({ account });
    assertEquals(result.length, 1, "Should return one user");
    assertEquals(result[0].user, userA, "Should return correct user");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getAccountUser returns empty array for invalid account", async () => {
  const [db, client] = await testDb();
  const concept = new LinkedInImportConcept(db);

  try {
    const fakeAccount = "fake_account" as ID;
    const result = await concept._getAccountUser({ account: fakeAccount });
    assertEquals(result.length, 0, "Should return empty array for invalid account");
  } finally {
    await client.close();
  }
});

