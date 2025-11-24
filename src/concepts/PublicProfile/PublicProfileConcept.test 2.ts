// PublicProfileConcept.test.ts
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

import PublicProfileConcept from "./PublicProfileConcept.ts";

const userA = "user:A" as ID;
const userB = "user:B" as ID;

//
// ------------------------------------------------------------
// Principle Test: Full lifecycle
// ------------------------------------------------------------
//

Deno.test("Principle: user creates, updates, views, and deletes a public profile", async () => {
  const [db, client] = await testDb();
  const profileConcept = new PublicProfileConcept(db);

  try {
    //
    // 1. User creates profile
    //
    const createRes = await profileConcept.createProfile({
      user: userA,
      headline: "Software Engineer",
      attributes: ["TypeScript", "Deno"],
      links: ["github.com/a"],
    });

    assertEquals("error" in createRes, false, "Profile creation must succeed.");

    //
    // 2. Profile exists
    //
    const get1 = await profileConcept._getProfile({ user: userA });
    assertEquals(get1.length, 1, "Profile should exist after creation.");
    assertEquals(get1[0].profile.headline, "Software Engineer");

    //
    // 3. Update headline + add attributes
    //
    const updateRes = await profileConcept.updateProfile({
      user: userA,
      headline: "Senior Software Engineer",
      attributes: ["TypeScript", "Deno", "Rust"],
    });

    assertEquals("error" in updateRes, false, "Update should succeed.");

    const get2 = await profileConcept._getProfile({ user: userA });
    assertEquals(get2[0].profile.headline, "Senior Software Engineer");
    assertEquals(get2[0].profile.attributes.length, 3);

    //
    // 4. Delete profile
    //
    const del = await profileConcept.deleteProfile({ user: userA });
    assertEquals("error" in del, false, "Delete should succeed.");

    const get3 = await profileConcept._getProfile({ user: userA });
    assertEquals(get3.length, 0, "Profile should be removed after deletion.");
  } finally {
    await client.close();
  }
});

//
// ------------------------------------------------------------
// Action Tests
// ------------------------------------------------------------
//

Deno.test("Action: createProfile enforces headline and unique user", async () => {
  const [db, client] = await testDb();
  const profileConcept = new PublicProfileConcept(db);

  try {
    //
    // headline cannot be empty
    //
    const emptyHeadline = await profileConcept.createProfile({
      user: userA,
      headline: "",
      attributes: [],
      links: [],
    });
    assertEquals("error" in emptyHeadline, true);

    //
    // valid creation
    //
    const ok = await profileConcept.createProfile({
      user: userA,
      headline: "Engineer",
      attributes: [],
      links: [],
    });
    assertEquals("error" in ok, false);

    //
    // cannot create again for same user
    //
    const dup = await profileConcept.createProfile({
      user: userA,
      headline: "Duplicate",
      attributes: [],
      links: [],
    });
    assertEquals("error" in dup, true, "Duplicate profiles must fail.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateProfile requires profile to exist and headline to be non-empty when provided", async () => {
  const [db, client] = await testDb();
  const profileConcept = new PublicProfileConcept(db);

  try {
    //
    // updating a non-existent profile
    //
    const fail1 = await profileConcept.updateProfile({
      user: userA,
      headline: "Hi",
    });
    assertEquals(
      "error" in fail1,
      true,
      "Updating a non-existent profile must fail.",
    );

    //
    // create valid profile
    //
    await profileConcept.createProfile({
      user: userA,
      headline: "Engineer",
      attributes: ["A"],
      links: [],
    });

    //
    // headline cannot be empty
    //
    const invalidHeadline = await profileConcept.updateProfile({
      user: userA,
      headline: "   ",
    });
    assertEquals("error" in invalidHeadline, true);

    //
    // valid update
    //
    const ok = await profileConcept.updateProfile({
      user: userA,
      headline: "Developer",
      links: ["x.com"],
    });
    assertEquals("error" in ok, false);

    const fetched = await profileConcept._getProfile({ user: userA });
    assertEquals(fetched[0].profile.headline, "Developer");
    assertEquals(fetched[0].profile.links[0], "x.com");
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteProfile requires profile to exist", async () => {
  const [db, client] = await testDb();
  const profileConcept = new PublicProfileConcept(db);

  try {
    //
    // deleting non-existent profile
    //
    const noSuch = await profileConcept.deleteProfile({ user: userA });
    assertEquals("error" in noSuch, true);

    //
    // create + delete works
    //
    await profileConcept.createProfile({
      user: userA,
      headline: "Engineer",
      attributes: [],
      links: [],
    });

    const ok = await profileConcept.deleteProfile({ user: userA });
    assertEquals("error" in ok, false);

    const check = await profileConcept._getProfile({ user: userA });
    assertEquals(check.length, 0);
  } finally {
    await client.close();
  }
});

//
// ------------------------------------------------------------
// More Edge-Case Tests (attributes/links overwrite & dedupe)
// ------------------------------------------------------------
//

Deno.test("Action: attribute & link deduplication and overwriting works correctly", async () => {
  const [db, client] = await testDb();
  const profileConcept = new PublicProfileConcept(db);

  try {
    await profileConcept.createProfile({
      user: userA,
      headline: "Engineer",
      attributes: ["Go", "Go", "TS"],
      links: ["a.com", "a.com"],
    });

    const p1 = await profileConcept._getProfile({ user: userA });
    assertEquals(p1[0].profile.attributes.length, 2);
    assertEquals(p1[0].profile.links.length, 1);

    //
    // overwrite lists entirely
    //
    await profileConcept.updateProfile({
      user: userA,
      attributes: [],
      links: ["new.com"],
    });

    const p2 = await profileConcept._getProfile({ user: userA });
    assertEquals(p2[0].profile.attributes.length, 0);
    assertEquals(p2[0].profile.links[0], "new.com");
  } finally {
    await client.close();
  }
});
