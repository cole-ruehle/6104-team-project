import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "PublicProfileConcept" + ".";

type User = ID;

/**
 * MongoDB representation of the concept state.
 */
interface ProfileDoc {
  _id: ID; // Unique profile document ID (different from user ID)
  user: User; // Maps to the user ID
  headline: string;
  attributes: string[];
  links: string[];
  profilePictureUrl?: string; // Optional profile picture URL
}

/**
 * Public shape returned from `_getProfile`.
 */
interface PublicProfileConceptQueryResult {
  user: User;
  headline: string;
  attributes: string[];
  links: string[];
}

export default class PublicProfileConceptConcept {
  profiles: Collection<ProfileDoc>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
  }

  /**
   * createProfile (user, headline, attributes, links)
   *
   * requires:
   *  - No profile exists for user.
   *  - user exists (handled externally).
   *  - headline is not empty.
   *
   * effects:
   *  - Creates a profile.
   */
  async createProfile(
    { user, headline, attributes, links }: {
      user: User;
      headline: string;
      attributes: string[];
      links: string[];
    },
  ): Promise<Empty | { error: string }> {
    // Requires: no entry exists
    const existing = await this.profiles.findOne({ user: user });
    if (existing) {
      return { error: "Profile exists already, update your profile instead." };
    }

    // Requires: headline non-empty
    if (!headline || headline.trim() === "") {
      return { error: "Headline cannot be empty." };
    }

    // Remove duplicates
    attributes = [...new Set(attributes)];
    links = [...new Set(links)];

    const newDoc: ProfileDoc = {
      _id: freshID(),
      user: user,
      headline: headline.trim(),
      attributes,
      links,
    };

    try {
      await this.profiles.insertOne(newDoc);
      return {};
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error(`Error creating profile for user ${user}:`, err);
      return { error: `Failed to create profile: ${err.message}` };
    }
  }

  /**
   * updateProfile (user, headline?, attributes?, links?)
   *
   * requires:
   *  - profile exists.
   *  - if headline is provided, it is not empty.
   *
   * effects:
   *  - updates only provided fields.
   *  - overwrites if provided empty (e.g. attributes: []).
   *  - preserves fields not provided.
   */
  async updateProfile(
    { user, headline, attributes, links, profilePictureUrl }: {
      user: User;
      headline?: string;
      attributes?: string[];
      links?: string[];
      profilePictureUrl?: string;
    },
  ): Promise<Empty | { error: string }> {
    const exists = await this.profiles.findOne({ user: user });
    if (!exists) {
      return { error: `Profile for user ${user} does not exist.` };
    }

    const updateFields: Partial<ProfileDoc> = {};

    // headline provided
    if (headline !== undefined) {
      if (typeof headline !== "string" || headline.trim() === "") {
        return { error: "Headline cannot be empty." };
      }
      updateFields.headline = headline.trim();
    }

    // attributes provided
    if (attributes !== undefined) {
      updateFields.attributes = attributes;
    }

    // links provided
    if (links !== undefined) {
      updateFields.links = links;
    }

    // profilePictureUrl provided
    if (profilePictureUrl !== undefined) {
      updateFields.profilePictureUrl = profilePictureUrl;
    }

    // nothing to update
    if (Object.keys(updateFields).length === 0) {
      return {};
    }

    try {
      await this.profiles.updateOne(
        { user: user },
        { $set: updateFields },
      );
      return {};
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error(`Error updating profile for user ${user}:`, err);
      return { error: `Failed to update profile: ${err.message}` };
    }
  }

  /**
   * deleteProfile (user)
   *
   * requires:
   *  - profile exists.
   *
   * effects:
   *  - deletes the profile.
   */
  async deleteProfile(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.profiles.deleteOne({ user: user });

      if (result.deletedCount === 0) {
        return { error: `Profile for user ${user} does not exist.` };
      }

      return {};
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error(`Error deleting profile for user ${user}:`, err);
      return { error: `Failed to delete profile: ${err.message}` };
    }
  }

  /**
   * _getProfile (user)
   *
   * effects:
   *  - returns [{ profile: {..} }] or [].
   */
  async _getProfile(
    { user }: { user: User },
  ): Promise<{ profile: PublicProfileConceptQueryResult }[]> {
    try {
      const doc = await this.profiles.findOne({ user: user });

      if (!doc) return [];

      return [{
        profile: {
          user: doc.user,
          headline: doc.headline,
          attributes: doc.attributes,
          links: doc.links,
          profilePictureUrl: doc.profilePictureUrl,
        } as PublicProfileConceptQueryResult & { profilePictureUrl?: string },
      }];
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error(`Error fetching profile for user ${user}:`, err);
      return [];
    }
  }
}
