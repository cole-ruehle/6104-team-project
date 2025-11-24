---
timestamp: 'Thu Nov 20 2025 21:35:00 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251120_213500.3cba54a5.md]]'
content_id: eb3276ad6aa754274b011f9ef9be2ec68ab64511e36e6e01dc773eae780fd90d
---

# implement: PasswordAuthentication

```typescript
// file: src/concepts/PasswordAuthentication/PasswordAuthenticationConcept.ts
import { Collection, Db } from "npm:mongodb";
import bcrypt from "npm:bcrypt";

import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * concept PasswordAuthentication
 *
 * purpose: provide username/password based registration and authentication.
 *
 * principle: After a user registers with a username and password, they can authenticate using the same credentials.
 * Passwords are stored hashed with a salt. Helper functions to hash/verify passwords are internal.
 */

// Declare collection prefix for this concept
const PREFIX = "PasswordAuthentication" + ".";

/**
 * Type representing a User ID.
 * Generic type for objects created externally to this concept.
 */
type User = ID;

/**
 * Interface for the User document stored in MongoDB.
 * Corresponds to: "a set of Users with an id User, a username String, a passwordHash String"
 */
interface UserDoc {
  _id: User; // The ID of the user, generic type
  username: string;
  passwordHash: string; // Stored as a bcrypt salted hash string
}

export default class PasswordAuthenticationConcept {
  private users: Collection<UserDoc>;
  private readonly saltRounds = 10; // Number of salt rounds for bcrypt hashing

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * internal helpers (implementation detail)
   * hashPassword(password: String) -> String
   *
   * **effects** returns salted hash string (salt:hash)
   */
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * internal helpers (implementation detail)
   * verifyPassword(password: String, stored: String) -> Boolean
   *
   * **effects** verifies a plaintext password against stored salted hash using timing-safe comparison
   */
  private async verifyPassword(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, storedHash);
  }

  /**
   * register(username: String, password: String): { user: User } | { error: String }
   *
   * **requires** username does not already exist
   * **effects** creates a new user with a salted+hashed password and returns user id
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check if username already exists (precondition)
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: "Username already exists." };
    }

    // Hash the password
    const passwordHash = await this.hashPassword(password);

    // Create a new user document
    const newUser: UserDoc = {
      _id: freshID() as User, // Generate a fresh ID for the new user
      username,
      passwordHash,
    };

    // Insert the new user into the collection (effect)
    await this.users.insertOne(newUser);

    // Return the new user's ID
    return { user: newUser._id };
  }

  /**
   * authenticate(username: String, password: String): { user: User } | { error: String }
   *
   * **requires** username exists and password matches stored hash
   * **effects** returns the authenticated user's id
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Find the user by username
    const user = await this.users.findOne({ username });

    if (!user) {
      // Return generic error for security reasons (don't reveal if username exists)
      return { error: "Invalid username or password." };
    }

    // Verify the password against the stored hash
    const isPasswordValid = await this.verifyPassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      // Return generic error
      return { error: "Invalid username or password." };
    }

    // Return the authenticated user's ID
    return { user: user._id };
  }

  /**
   * searchUsers(query: String, limit?: Number): { users: User[] }
   *
   * **requires** none
   * **effects** performs a case-insensitive search of usernames and returns up to `limit` matches (default 10)
   */
  async searchUsers(
    { query, limit = 10 }: { query: string; limit?: number },
  ): Promise<{ users: User[] }> {
    const searchRegex = new RegExp(query, "i"); // Case-insensitive regex search
    const matchingUsers = await this.users.find(
      { username: { $regex: searchRegex } },
    ).limit(limit).project({ _id: 1 }).toArray(); // Only retrieve the _id field

    // Map to an array of User IDs
    return { users: matchingUsers.map((u) => u._id) };
  }

  /**
   * _getUserByUsername(username: String): { user: User }[]
   *
   * **effects** returns an array containing the user id if username exists, otherwise an empty array
   * Note: Queries always return an array of dictionaries, as per concept design guidelines.
   */
  async _getUserByUsername(
    { username }: { username: string },
  ): Promise<{ user: User }[]> {
    const user = await this.users.findOne({ username });
    if (user) {
      return [{ user: user._id }];
    }
    return [];
  }

  /**
   * _getUserById(id: User): { id: User, username: String }[]
   *
   * **effects** returns an array containing the user's id and username when found, otherwise an empty array
   * Note: Queries always return an array of dictionaries, as per concept design guidelines.
   */
  async _getUserById(
    { id }: { id: User },
  ): Promise<{ id: User; username: string }[]> {
    const user = await this.users.findOne({ _id: id });
    if (user) {
      return [{ id: user._id, username: user.username }];
    }
    return [];
  }
}
```
