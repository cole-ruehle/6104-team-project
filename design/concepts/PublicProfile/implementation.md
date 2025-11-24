[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@user-authentication-concept](./PublicProfile.md)

# implement: PublicProfile

# response:

```typescript
// file: src/concepts/PublicProfile/PublicProfile.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Declare collection prefix, use concept name
const PREFIX = "PublicProfile" + ".";

// Generic type of this concept
type User = ID;

/**
 * Interface for the MongoDB document stored in the 'profiles' collection.
 * Corresponds to the concept's state:
 * a set of `Profiles` with
 *   `user` User
 *   `headline` String
 *   `attributes` set of String
 *   `links` set of String
 *
 * The `user` field from the concept state is used as the `_id` in MongoDB for efficient lookup.
 */
interface ProfileDoc {
  _id: User; // Maps to 'user' from the concept spec
  headline: string;
  attributes: string[];
  links: string[];
}

/**
 * Interface for the structure of the profile object returned by the `_getProfile` query.
 * Matches the conceptual structure of a profile.
 */
interface PublicProfileQueryResult {
  user: User; // The ID of the user whose profile this is
  headline: string;
  attributes: string[];
  links: string[];
}

/**
 * **concept**: PublicProfile [User]
 *
 * **purpose**: Provide a concise, public-facing description of a user that others can quickly scan and interpret.
 *
 * **principle**: When a user creates a public profile with a headline, attributes, and links,
 * anyone can later view that user’s profile and consistently see the same information;
 * if the user updates their profile, viewers will see the updated information the next time it is accessed.
 */
export default class PublicProfile {
  profiles: Collection<ProfileDoc>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
  }

  /**
   * createProfile (user: User, headline: String, attributes: set of String, links: set of String): Empty
   *
   * **requires**:
   *   - No `Profiles` entry exists for `user`.
   *   - `user` exists. (This concept treats `User` as an opaque ID. The existence of a user entity itself is typically
   *     managed by a separate concept, e.g., UserAuthentication, and linked via syncs if needed).
   *   - `headline` is not empty.
   *
   * **effects**:
   *   - Creates a new profile for `user` with the provided headline, attributes, and links.
   */
  async createProfile(
    { user, headline, attributes, links }: {
      user: User;
      headline: string;
      attributes: string[];
      links: string[];
    },
  ): Promise<Empty | { error: string }> {
    // Requires: No Profiles entry exists for user.
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (existingProfile) {
      return { error: `Profile for user ${user} already exists.` };
    }

    // Requires: headline is not empty.
    if (!headline || headline.trim() === "") {
      return { error: "Headline cannot be empty." };
    }

    // Effects: Creates a new profile for user.
    const newProfile: ProfileDoc = {
      _id: user, // Use the user ID as the document ID
      headline: headline.trim(),
      attributes: attributes || [], // Ensure it's an array, handling potential undefined input
      links: links || [], // Ensure it's an array, handling potential undefined input
    };

    try {
      await this.profiles.insertOne(newProfile);
      return {};
    } catch (e) {
      console.error(`Error creating profile for user ${user}:`, e);
      return { error: `Failed to create profile: ${e.message || "unknown error"}` };
    }
  }

  /**
   * updateProfile (user: User, headline: String?, attributes: set of String?, links: set of String?): Empty
   *
   * **requires**:
   *   - A `Profiles` entry exists for `user`.
   *   - If `headline` is provided, it is not empty.
   *
   * **effects**:
   *   - Updates each provided field on the profile.
   *   - Leaves unprovided fields unchanged.
   *   - Overwrites fields if explicitly provided as empty (e.g., `attributes: []`).
   */
  async updateProfile(
    { user, headline, attributes, links }: {
      user: User;
      headline?: string;
      attributes?: string[];
      links?: string[];
    },
  ): Promise<Empty | { error: string }> {
    // Requires: A Profiles entry exists for user.
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: `Profile for user ${user} does not exist.` };
    }

    const updateFields: Partial<ProfileDoc> = {};

    // If headline is provided (not undefined), process it.
    if (headline !== undefined) {
      if (headline.trim() === "") {
        return { error: "Headline cannot be empty." };
      }
      updateFields.headline = headline.trim();
    }

    // If attributes are provided (not undefined), update them.
    if (attributes !== undefined) {
      updateFields.attributes = attributes;
    }

    // If links are provided (not undefined), update them.
    if (links !== undefined) {
      updateFields.links = links;
    }

    // Only perform an update if there are actual fields to change.
    if (Object.keys(updateFields).length > 0) {
      try {
        await this.profiles.updateOne(
          { _id: user },
          { $set: updateFields },
        );
      } catch (e) {
        console.error(`Error updating profile for user ${user}:`, e);
        return { error: `Failed to update profile: ${e.message || "unknown error"}` };
      }
    }

    return {};
  }

  /**
   * deleteProfile (user: User): Empty
   *
   * **requires**:
   *   - A `Profiles` entry exists for `user`.
   *
   * **effects**:
   *   - Removes the profile for `user`.
   */
  async deleteProfile(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    // Requires: A Profiles entry exists for user.
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: `Profile for user ${user} does not exist.` };
    }

    // Effects: Removes the profile for user.
    try {
      await this.profiles.deleteOne({ _id: user });
      return {};
    } catch (e) {
      console.error(`Error deleting profile for user ${user}:`, e);
      return { error: `Failed to delete profile: ${e.message || "unknown error"}` };
    }
  }

  /**
   * _getProfile (user: User): (profile: PublicProfileQueryResult)
   *
   * **requires**:
   *   - (Implicit) A `Profiles` entry exists for `user` to return a non-empty result.
   *
   * **effects**:
   *   - Returns an array containing the profile for the given `user`, or an empty array if not found.
   *   - The profile is returned as an object under the 'profile' key, matching the query signature convention.
   */
  async _getProfile(
    { user }: { user: User },
  ): Promise<{ profile: PublicProfileQueryResult }[]> {
    try {
      const profileDoc = await this.profiles.findOne({ _id: user });
      if (profileDoc) {
        return [{
          profile: {
            user: profileDoc._id, // Map _id back to 'user' for consistency with concept spec
            headline: profileDoc.headline,
            attributes: profileDoc.attributes,
            links: profileDoc.links,
          },
        }];
      }
      return []; // Return an empty array if no profile is found, consistent with query returning multiple objects
    } catch (e) {
      console.error(`Error fetching profile for user ${user}:`, e);
      // In a real system, you might want to return an error object here
      // For queries, the prompt states "Errors and exceptions are treated as if they were normal results."
      // But it doesn't specify an explicit error return type for queries.
      // Returning an empty array for "not found" is common for queries.
      // For actual system errors, logging is key.
      return [];
    }
  }
}
```
