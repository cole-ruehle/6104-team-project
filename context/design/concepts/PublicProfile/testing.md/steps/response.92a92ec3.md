---
timestamp: 'Sat Nov 22 2025 09:07:49 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_090749.d0ad49b8.md]]'
content_id: 92a92ec3acb26b9de8025c57c18dd456458cb65e612e5beef50a8a055ec7f273
---

# response:

```typescript
// file: src/PublicProfile/PublicProfileConcept.test.ts

import { testDb } from "@utils/database.ts"; // Assuming @utils/database.ts provides testDb
import { assertEquals, assertNotEquals, assertArrayIncludes, assert } from "jsr:@std/assert";
import { Collection, MongoClient } from "npm:mongodb"; // Assuming MongoDB for the database

// --- Mock/Simulated PublicProfile API for Concept Testing ---
// In a real scenario, these would be imported from src/PublicProfile/PublicProfile.ts
// or a similar service layer. For concept testing, we define them here
// to clearly show the expected behavior being tested.

interface PublicProfileDoc {
  userId: string;
  headline: string;
  attributes: string[];
  links: string[];
}

const PUBLIC_PROFILES_COLLECTION = "publicProfiles";

/**
 * Helper function to retrieve a profile for verification.
 */
async function getPublicProfile(
  db: MongoClient,
  userId: string,
): Promise<PublicProfileDoc | null> {
  const collection: Collection<PublicProfileDoc> = db.collection(PUBLIC_PROFILES_COLLECTION);
  return await collection.findOne({ userId });
}

/**
 * Creates a new public profile.
 * @param db The database client.
 * @param userId The unique ID of the user.
 * @param headline The profile headline.
 * @param attributes A list of attributes.
 * @param links A list of links.
 * @returns An object with an `error` key if creation fails, otherwise an empty object.
 */
async function createPublicProfile(
  db: MongoClient,
  userId: string,
  headline: string,
  attributes: string[],
  links: string[],
): Promise<{ error?: string }> {
  console.log(`ACTION: createPublicProfile(userId: ${userId}, headline: "${headline}", attributes: [${attributes}], links: [${links}])`);

  if (!userId) {
    return { error: "User ID cannot be empty." };
  }
  if (!headline || headline.trim() === "") {
    return { error: "Headline cannot be empty." };
  }

  const collection: Collection<PublicProfileDoc> = db.collection(PUBLIC_PROFILES_COLLECTION);
  const existing = await collection.findOne({ userId });
  if (existing) {
    return { error: `Profile for user ${userId} already exists.` };
  }

  const dedupedAttributes = [...new Set(attributes)];
  const dedupedLinks = [...new Set(links)];

  try {
    await collection.insertOne({
      userId,
      headline: headline.trim(),
      attributes: dedupedAttributes,
      links: dedupedLinks,
    });
    return {};
  } catch (e) {
    return { error: `Database error during creation: ${e.message}` };
  }
}

/**
 * Updates an existing public profile.
 * @param db The database client.
 * @param userId The ID of the user whose profile to update.
 * @param updates An object containing fields to update (headline, attributes, links).
 * @returns An object with an `error` key if update fails, otherwise an empty object.
 */
async function updatePublicProfile(
  db: MongoClient,
  userId: string,
  updates: { headline?: string; attributes?: string[]; links?: string[] },
): Promise<{ error?: string }> {
  console.log(`ACTION: updatePublicProfile(userId: ${userId}, updates: ${JSON.stringify(updates)})`);

  const collection: Collection<PublicProfileDoc> = db.collection(PUBLIC_PROFILES_COLLECTION);
  const existing = await collection.findOne({ userId });

  if (!existing) {
    return { error: `Profile for user ${userId} not found.` };
  }

  if (updates.headline !== undefined && updates.headline.trim() === "") {
    return { error: "Headline cannot be empty." };
  }

  const updateDoc: Partial<PublicProfileDoc> = {};
  if (updates.headline !== undefined) updateDoc.headline = updates.headline.trim();
  if (updates.attributes !== undefined) updateDoc.attributes = [...new Set(updates.attributes)];
  if (updates.links !== undefined) updateDoc.links = [...new Set(updates.links)];

  if (Object.keys(updateDoc).length === 0) {
    return {}; // No effective updates provided
  }

  try {
    await collection.updateOne({ userId }, { $set: updateDoc });
    return {};
  } catch (e) {
    return { error: `Database error during update: ${e.message}` };
  }
}

/**
 * Deletes an existing public profile.
 * @param db The database client.
 * @param userId The ID of the user whose profile to delete.
 * @returns An object with an `error` key if deletion fails, otherwise `deletedCount`.
 */
async function deletePublicProfile(
  db: MongoClient,
  userId: string,
): Promise<{ error?: string; deletedCount?: number }> {
  console.log(`ACTION: deletePublicProfile(userId: ${userId})`);

  const collection: Collection<PublicProfileDoc> = db.collection(PUBLIC_PROFILES_COLLECTION);
  try {
    const result = await collection.deleteOne({ userId });
    if (result.deletedCount === 0) {
      return { error: `Profile for user ${userId} not found.`, deletedCount: 0 };
    }
    return { deletedCount: result.deletedCount };
  } catch (e) {
    return { error: `Database error during deletion: ${e.message}` };
  }
}

// --- Test Cases for PublicProfile Concept ---

Deno.test("PublicProfile Concept Testing", async (t) => {
  const [db, client] = await testDb();

  await t.step("1. Create a new profile with valid data", async () => {
    const userId = "user1";
    const headline = "Software Engineer";
    const attributes = ["TypeScript", "Deno"];
    const links = ["github.com/user1"];

    console.log("\n  Test Step: Create a new profile with valid data.");
    console.log("  Expected: Success, profile exists in DB with correct fields.");

    // Action
    const result = await createPublicProfile(db, userId, headline, attributes, links);

    // Confirmation: requires satisfied (unique ID, non-empty headline, valid arrays)
    assertEquals(result, {}, "Expected successful creation result.");
    console.log("  Confirmation: Action returned success ({}).");

    // Confirmation: effects satisfied (DB state changed)
    const profile = await getPublicProfile(db, userId);
    assert(profile !== null, "Expected profile to be found in the database.");
    assertEquals(profile!.userId, userId);
    assertEquals(profile!.headline, headline);
    assertEquals(profile!.attributes, attributes);
    assertEquals(profile!.links, links);
    console.log("  Confirmation: Profile found in DB with correct fields.");
  });

  await t.step("2. Attempt to create a duplicate profile", async () => {
    const userId = "user2";
    const headline = "Data Scientist";
    const attributes = ["Python"];
    const links = [];

    console.log("\n  Test Step: Attempt to create a duplicate profile.");
    console.log("  Expected: First creation succeeds, second returns an error.");

    // Action 1: Create successfully
    const firstCreateResult = await createPublicProfile(db, userId, headline, attributes, links);
    assertEquals(firstCreateResult, {}, "Expected first creation to succeed.");
    console.log("  Trace: First creation for user2 succeeded.");

    // Confirmation: Profile exists
    assert(await getPublicProfile(db, userId) !== null, "Profile should exist after first creation.");

    // Action 2: Attempt to create again with same ID
    const secondCreateResult = await createPublicProfile(db, userId, headline, attributes, links);

    // Confirmation: requires unsatisfied (duplicate userId)
    assertNotEquals(secondCreateResult, {}, "Expected second creation to return an error.");
    assertEquals(secondCreateResult.error, `Profile for user ${userId} already exists.`);
    console.log(`  Confirmation: Second creation returned expected error: '${secondCreateResult.error}'.`);

    // Confirmation: effects satisfied (DB state unchanged for this action, original profile persists)
    const profile = await getPublicProfile(db, userId);
    assert(profile !== null, "Original profile should still exist.");
  });

  await t.step("3. Attempt to create a profile with empty or whitespace headline", async () => {
    const userId1 = "user3a";
    const userId2 = "user3b";

    console.log("\n  Test Step: Attempt to create a profile with empty or whitespace headline.");
    console.log("  Expected: Both attempts should return an error.");

    // Action 1: Empty headline
    const result1 = await createPublicProfile(db, userId1, "", [], []);
    assertNotEquals(result1, {}, "Expected creation with empty headline to fail.");
    assertEquals(result1.error, "Headline cannot be empty.");
    console.log(`  Confirmation: Empty headline returned expected error: '${result1.error}'.`);
    assertEquals(await getPublicProfile(db, userId1), null, "No profile should be created for empty headline.");

    // Action 2: Whitespace headline
    const result2 = await createPublicProfile(db, userId2, "   ", [], []);
    assertNotEquals(result2, {}, "Expected creation with whitespace headline to fail.");
    assertEquals(result2.error, "Headline cannot be empty.");
    console.log(`  Confirmation: Whitespace headline returned expected error: '${result2.error}'.`);
    assertEquals(await getPublicProfile(db, userId2), null, "No profile should be created for whitespace headline.");
  });

  await t.step("4. Attributes = [] and Links = [] on create: Allowed, should store empty arrays", async () => {
    const userId = "user4";
    const headline = "Minimalist";
    const attributes: string[] = [];
    const links: string[] = [];

    console.log("\n  Test Step: Create profile with empty attributes and links.");
    console.log("  Expected: Success, profile exists with empty arrays for attributes and links.");

    // Action
    const result = await createPublicProfile(db, userId, headline, attributes, links);

    // Confirmation: requires satisfied (empty arrays are valid)
    assertEquals(result, {}, "Expected successful creation with empty arrays.");
    console.log("  Confirmation: Action returned success ({}).");

    // Confirmation: effects satisfied
    const profile = await getPublicProfile(db, userId);
    assert(profile !== null, "Expected profile to be found.");
    assertEquals(profile!.attributes, []);
    assertEquals(profile!.links, []);
    console.log("  Confirmation: Profile found with empty attributes and links.");
  });

  await t.step("5. Attributes or links containing duplicates: Should store a deduped array", async () => {
    const userId = "user5";
    const headline = "Full Stack Dev";
    const attributes = ["JavaScript", "Deno", "JavaScript", "React"];
    const links = ["linkedin.com/user5", "github.com/user5", "linkedin.com/user5"];
    const expectedAttributes = ["JavaScript", "Deno", "React"];
    const expectedLinks = ["linkedin.com/user5", "github.com/user5"];

    console.log("\n  Test Step: Create profile with duplicate attributes and links.");
    console.log("  Expected: Success, attributes and links are stored as deduped arrays.");

    // Action
    const result = await createPublicProfile(db, userId, headline, attributes, links);

    // Confirmation: requires satisfied
    assertEquals(result, {}, "Expected successful creation.");
    console.log("  Confirmation: Action returned success ({}).");

    // Confirmation: effects satisfied (deduplication)
    const profile = await getPublicProfile(db, userId);
    assert(profile !== null, "Expected profile to be found.");
    assertEquals(profile!.attributes.length, expectedAttributes.length, "Attributes should be deduped.");
    assertArrayIncludes(profile!.attributes, expectedAttributes);
    assertEquals(profile!.links.length, expectedLinks.length, "Links should be deduped.");
    assertArrayIncludes(profile!.links, expectedLinks);
    console.log("  Confirmation: Profile found with deduped attributes and links.");
  });

  await t.step("6. Update headline only: Ensure unprovided fields remain unchanged", async () => {
    const userId = "user6";
    const initialHeadline = "Old Headline";
    const initialAttributes = ["InitialAttr"];
    const initialLinks = ["InitialLink"];
    const newHeadline = "New and Improved Headline";

    console.log("\n  Test Step: Update headline only.");
    console.log("  Expected: Headline changes, attributes and links remain unchanged.");

    // Setup: Create initial profile
    await createPublicProfile(db, userId, initialHeadline, initialAttributes, initialLinks);
    const initialProfile = await getPublicProfile(db, userId);
    assert(initialProfile !== null, "Setup: Profile should exist.");
    console.log("  Trace: Initial profile created.");

    // Action
    const result = await updatePublicProfile(db, userId, { headline: newHeadline });

    // Confirmation: requires satisfied (profile exists, headline not empty)
    assertEquals(result, {}, "Expected successful update.");
    console.log("  Confirmation: Action returned success ({}).");

    // Confirmation: effects satisfied
    const updatedProfile = await getPublicProfile(db, userId);
    assert(updatedProfile !== null, "Updated profile should exist.");
    assertEquals(updatedProfile!.headline, newHeadline);
    assertEquals(updatedProfile!.attributes, initialAttributes, "Attributes should not have changed.");
    assertEquals(updatedProfile!.links, initialLinks, "Links should not have changed.");
    console.log("  Confirmation: Headline updated, other fields unchanged.");
  });

  await t.step("7. Update attributes only: Ensure unprovided fields remain unchanged", async () => {
    const userId = "user7";
    const initialHeadline = "Dev Rel";
    const initialAttributes = ["Speaking", "Community"];
    const initialLinks = ["blog.com/user7"];
    const newAttributes = ["Writing", "Mentoring"];

    console.log("\n  Test Step: Update attributes only.");
    console.log("  Expected: Attributes change, headline and links remain unchanged.");

    // Setup: Create initial profile
    await createPublicProfile(db, userId, initialHeadline, initialAttributes, initialLinks);
    const initialProfile = await getPublicProfile(db, userId);
    assert(initialProfile !== null, "Setup: Profile should exist.");
    console.log("  Trace: Initial profile created.");

    // Action
    const result = await updatePublicProfile(db, userId, { attributes: newAttributes });

    // Confirmation: requires satisfied (profile exists)
    assertEquals(result, {}, "Expected successful update.");
    console.log("  Confirmation: Action returned success ({}).");

    // Confirmation: effects satisfied
    const updatedProfile = await getPublicProfile(db, userId);
    assert(updatedProfile !== null, "Updated profile should exist.");
    assertEquals(updatedProfile!.headline, initialHeadline, "Headline should not have changed.");
    assertEquals(updatedProfile!.attributes, newAttributes);
    assertEquals(updatedProfile!.links, initialLinks, "Links should not have changed.");
    console.log("  Confirmation: Attributes updated, other fields unchanged.");
  });

  await t.step("8. Update links only: Ensure unprovided fields remain unchanged", async () => {
    const userId = "user8";
    const initialHeadline = "UX Designer";
    const initialAttributes = ["Figma", "User Research"];
    const initialLinks = ["portfolio.com/user8"];
    const newLinks = ["dribbble.com/user8"];

    console.log("\n  Test Step: Update links only.");
    console.log("  Expected: Links change, headline and attributes remain unchanged.");

    // Setup: Create initial profile
    await createPublicProfile(db, userId, initialHeadline, initialAttributes, initialLinks);
    const initialProfile = await getPublicProfile(db, userId);
    assert(initialProfile !== null, "Setup: Profile should exist.");
    console.log("  Trace: Initial profile created.");

    // Action
    const result = await updatePublicProfile(db, userId, { links: newLinks });

    // Confirmation: requires satisfied (profile exists)
    assertEquals(result, {}, "Expected successful update.");
    console.log("  Confirmation: Action returned success ({}).");

    // Confirmation: effects satisfied
    const updatedProfile = await getPublicProfile(db, userId);
    assert(updatedProfile !== null, "Updated profile should exist.");
    assertEquals(updatedProfile!.headline, initialHeadline, "Headline should not have changed.");
    assertEquals(updatedProfile!.attributes, initialAttributes, "Attributes should not have changed.");
    assertEquals(updatedProfile!.links, newLinks);
    console.log("  Confirmation: Links updated, other fields unchanged.");
  });

  await t.step("9. Update nonexistent profile: Should give error", async () => {
    const userId = "nonexistentUser";

    console.log("\n  Test Step: Attempt to update a nonexistent profile.");
    console.log("  Expected: Returns an error indicating profile not found.");

    // Action
    const result = await updatePublicProfile(db, userId, { headline: "New Headline" });

    // Confirmation: requires unsatisfied (profile doesn't exist)
    assertNotEquals(result, {}, "Expected update to fail.");
    assertEquals(result.error, `Profile for user ${userId} not found.`);
    console.log(`  Confirmation: Action returned expected error: '${result.error}'.`);

    // Confirmation: effects satisfied (DB state unchanged)
    assertEquals(await getPublicProfile(db, userId), null, "No profile should have been created/updated.");
  });

  await t.step("10. Update profile with headline as an empty string: Should give error", async () => {
    const userId = "user10";
    const initialHeadline = "Existing Headline";

    console.log("\n  Test Step: Attempt to update a profile's headline to an empty string.");
    console.log("  Expected: Returns an error, and the headline remains unchanged.");

    // Setup: Create initial profile
    await createPublicProfile(db, userId, initialHeadline, [], []);
    const initialProfile = await getPublicProfile(db, userId);
    assert(initialProfile !== null, "Setup: Profile should exist.");
    console.log("  Trace: Initial profile created.");

    // Action
    const result = await updatePublicProfile(db, userId, { headline: "" });

    // Confirmation: requires unsatisfied (headline cannot be empty)
    assertNotEquals(result, {}, "Expected update to fail.");
    assertEquals(result.error, "Headline cannot be empty.");
    console.log(`  Confirmation: Action returned expected error: '${result.error}'.`);

    // Confirmation: effects satisfied (DB state unchanged for headline)
    const profileAfterAttempt = await getPublicProfile(db, userId);
    assert(profileAfterAttempt !== null, "Profile should still exist.");
    assertEquals(profileAfterAttempt!.headline, initialHeadline, "Headline should remain unchanged after failed update.");
    console.log("  Confirmation: Headline remained unchanged in the DB.");
  });

  await t.step("11. Explicitly overwrite to empty sets attributes = [] and links = []: Should wipe them", async () => {
    const userId = "user11";
    const initialHeadline = "Full profile";
    const initialAttributes = ["Attr1", "Attr2"];
    const initialLinks = ["Link1"];

    console.log("\n  Test Step: Explicitly overwrite attributes and links to empty arrays.");
    console.log("  Expected: Success, attributes and links become empty arrays in the DB.");

    // Setup: Create initial profile with data
    await createPublicProfile(db, userId, initialHeadline, initialAttributes, initialLinks);
    const initialProfile = await getPublicProfile(db, userId);
    assert(initialProfile !== null, "Setup: Profile should exist.");
    assertEquals(initialProfile!.attributes.length, 2);
    assertEquals(initialProfile!.links.length, 1);
    console.log("  Trace: Initial profile created with attributes and links.");

    // Action
    const result = await updatePublicProfile(db, userId, { attributes: [], links: [] });

    // Confirmation: requires satisfied (profile exists, empty arrays are valid updates)
    assertEquals(result, {}, "Expected successful update.");
    console.log("  Confirmation: Action returned success ({}).");

    // Confirmation: effects satisfied
    const updatedProfile = await getPublicProfile(db, userId);
    assert(updatedProfile !== null, "Updated profile should exist.");
    assertEquals(updatedProfile!.attributes, [], "Attributes should be wiped to an empty array.");
    assertEquals(updatedProfile!.links, [], "Links should be wiped to an empty array.");
    assertEquals(updatedProfile!.headline, initialHeadline, "Headline should remain unchanged.");
    console.log("  Confirmation: Attributes and links are now empty arrays.");
  });

  await t.step("12. Delete existing profile: Should delete", async () => {
    const userId = "user12";
    const headline = "To Be Deleted";

    console.log("\n  Test Step: Delete an existing profile.");
    console.log("  Expected: Success, profile no longer exists in DB.");

    // Setup: Create profile to delete
    await createPublicProfile(db, userId, headline, [], []);
    assert(await getPublicProfile(db, userId) !== null, "Setup: Profile should exist before deletion.");
    console.log("  Trace: Profile created for deletion.");

    // Action
    const result = await deletePublicProfile(db, userId);

    // Confirmation: requires satisfied (profile exists)
    assertEquals(result, { deletedCount: 1 }, "Expected successful deletion with deletedCount = 1.");
    console.log("  Confirmation: Action returned success ({ deletedCount: 1 }).");

    // Confirmation: effects satisfied
    assertEquals(await getPublicProfile(db, userId), null, "Profile should no longer exist in the database.");
    console.log("  Confirmation: Profile successfully deleted from DB.");
  });

  await t.step("13. Delete nonexistent: Should error", async () => {
    const userId = "nonexistentToDelete";

    console.log("\n  Test Step: Attempt to delete a nonexistent profile.");
    console.log("  Expected: Returns an error indicating profile not found, deletedCount = 0.");

    // Action
    const result = await deletePublicProfile(db, userId);

    // Confirmation: requires unsatisfied (profile doesn't exist)
    assertNotEquals(result, {}, "Expected deletion to fail.");
    assertEquals(result.error, `Profile for user ${userId} not found.`);
    assertEquals(result.deletedCount, 0);
    console.log(`  Confirmation: Action returned expected error: '${result.error}' with deletedCount: ${result.deletedCount}.`);

    // Confirmation: effects satisfied (DB state unchanged)
    assertEquals(await getPublicProfile(db, userId), null, "No profile should have been deleted.");
  });

  await t.step("14. Call delete twice: First success, second error (deletedCount = 0)", async () => {
    const userId = "user14";
    const headline = "Double Delete";

    console.log("\n  Test Step: Call delete twice on the same profile.");
    console.log("  Expected: First delete succeeds, second returns an error with deletedCount = 0.");

    // Setup: Create profile
    await createPublicProfile(db, userId, headline, [], []);
    assert(await getPublicProfile(db, userId) !== null, "Setup: Profile should exist.");
    console.log("  Trace: Profile created.");

    // Action 1: First delete
    const firstResult = await deletePublicProfile(db, userId);
    assertEquals(firstResult, { deletedCount: 1 }, "Expected first deletion to succeed.");
    console.log("  Trace: First delete succeeded.");

    // Confirmation: Profile no longer exists
    assertEquals(await getPublicProfile(db, userId), null, "Profile should be gone after first delete.");

    // Action 2: Second delete
    const secondResult = await deletePublicProfile(db, userId);

    // Confirmation: requires unsatisfied (profile already deleted)
    assertNotEquals(secondResult, {}, "Expected second deletion to fail.");
    assertEquals(secondResult.error, `Profile for user ${userId} not found.`);
    assertEquals(secondResult.deletedCount, 0);
    console.log(`  Confirmation: Second delete returned expected error: '${secondResult.error}' with deletedCount: ${secondResult.deletedCount}.`);
  });

  await t.step("15. Delete a profile, then create another with same ID, ensure the new creation succeeds", async () => {
    const userId = "user15";
    const headline1 = "Original Headline";
    const headline2 = "Recreated Headline";

    console.log("\n  Test Step: Delete a profile, then recreate one with the same user ID.");
    console.log("  Expected: Original creation and deletion succeed, then new creation with same ID succeeds.");

    // Setup 1: Create original profile
    const createResult1 = await createPublicProfile(db, userId, headline1, [], []);
    assertEquals(createResult1, {}, "Expected initial creation to succeed.");
    assert(await getPublicProfile(db, userId) !== null, "Setup: Original profile should exist.");
    console.log("  Trace: Original profile created.");

    // Action 1: Delete profile
    const deleteResult = await deletePublicProfile(db, userId);
    assertEquals(deleteResult, { deletedCount: 1 }, "Expected deletion to succeed.");
    assertEquals(await getPublicProfile(db, userId), null, "Profile should be deleted.");
    console.log("  Trace: Profile deleted.");

    // Action 2: Create a new profile with the same userId
    const createResult2 = await createPublicProfile(db, userId, headline2, ["NewAttr"], []);

    // Confirmation: requires satisfied (userId is now unique again)
    assertEquals(createResult2, {}, "Expected second creation with same ID to succeed after deletion.");
    console.log("  Confirmation: Second creation succeeded.");

    // Confirmation: effects satisfied (new profile exists with new data)
    const newProfile = await getPublicProfile(db, userId);
    assert(newProfile !== null, "Expected new profile to be found.");
    assertEquals(newProfile!.headline, headline2);
    assertEquals(newProfile!.attributes, ["NewAttr"]);
    console.log("  Confirmation: New profile found with updated data.");
  });

  // trace: Principle: A user can manage their public profile, including creating, updating, and deleting it.
  await t.step("Principle Trace: User profile management lifecycle", async () => {
    const userId = "principleUser";
    const initialHeadline = "Aspiring Developer";
    const initialAttributes = ["Learning Deno"];
    const initialLinks = ["example.com/blog"];

    console.log("\n  --- Principle Trace: User profile management lifecycle ---");
    console.log("  Demonstrating that a user can create, update, and delete their public profile.");

    // Step 1: User creates their profile.
    console.log("\n  Trace Step 1: User creates their profile.");
    const createRes = await createPublicProfile(db, userId, initialHeadline, initialAttributes, initialLinks);
    assertEquals(createRes, {}, "Principle Step 1: Profile creation should succeed.");
    let profile = await getPublicProfile(db, userId);
    assert(profile !== null, "Principle Step 1: Profile must exist after creation.");
    assertEquals(profile!.headline, initialHeadline);
    assertEquals(profile!.attributes, initialAttributes);
    console.log("  Expectation: Profile for 'principleUser' created successfully with initial data.");

    // Step 2: User updates their profile's headline.
    console.log("\n  Trace Step 2: User updates their profile's headline.");
    const newHeadline = "Experienced Deno Dev";
    const updateHeadlineRes = await updatePublicProfile(db, userId, { headline: newHeadline });
    assertEquals(updateHeadlineRes, {}, "Principle Step 2: Headline update should succeed.");
    profile = await getPublicProfile(db, userId);
    assert(profile !== null, "Principle Step 2: Profile must still exist.");
    assertEquals(profile!.headline, newHeadline);
    assertEquals(profile!.attributes, initialAttributes, "Principle Step 2: Attributes should remain unchanged.");
    console.log(`  Expectation: Headline updated to '${newHeadline}', other fields unchanged.`);

    // Step 3: User updates their profile's attributes and links.
    console.log("\n  Trace Step 3: User updates their profile's attributes and links.");
    const updatedAttributes = ["TypeScript", "MongoDB", "Deno"];
    const updatedLinks = ["github.com/principleUser", "linkedin.com/principleUser"];
    const updateAttrLinkRes = await updatePublicProfile(db, userId, { attributes: updatedAttributes, links: updatedLinks });
    assertEquals(updateAttrLinkRes, {}, "Principle Step 3: Attributes and links update should succeed.");
    profile = await getPublicProfile(db, userId);
    assert(profile !== null, "Principle Step 3: Profile must still exist.");
    assertEquals(profile!.attributes, updatedAttributes);
    assertEquals(profile!.links, updatedLinks);
    assertEquals(profile!.headline, newHeadline, "Principle Step 3: Headline should remain unchanged.");
    console.log("  Expectation: Attributes and links updated, headline unchanged.");

    // Step 4: User decides to remove all attributes and links.
    console.log("\n  Trace Step 4: User decides to remove all attributes and links.");
    const wipeRes = await updatePublicProfile(db, userId, { attributes: [], links: [] });
    assertEquals(wipeRes, {}, "Principle Step 4: Wiping attributes and links should succeed.");
    profile = await getPublicProfile(db, userId);
    assert(profile !== null, "Principle Step 4: Profile must still exist.");
    assertEquals(profile!.attributes, []);
    assertEquals(profile!.links, []);
    console.log("  Expectation: Attributes and links are now empty arrays.");

    // Step 5: User deletes their profile.
    console.log("\n  Trace Step 5: User deletes their profile.");
    const deleteRes = await deletePublicProfile(db, userId);
    assertEquals(deleteRes, { deletedCount: 1 }, "Principle Step 5: Profile deletion should succeed.");
    profile = await getPublicProfile(db, userId);
    assertEquals(profile, null, "Principle Step 5: Profile must no longer exist after deletion.");
    console.log("  Expectation: Profile for 'principleUser' successfully deleted from the system.");

    console.log("\n  --- Principle Trace Complete ---");
  });


  await client.close();
});
```
