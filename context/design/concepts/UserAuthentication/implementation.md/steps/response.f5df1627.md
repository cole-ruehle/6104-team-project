---
timestamp: 'Thu Nov 20 2025 21:38:01 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251120_213801.de5d688b.md]]'
content_id: f5df1627b74362a63f8515246d0a3832823637ed54476dfcf43fdc2a7a692d67
---

# response:

```typescript
// file: src/concepts/PasswordAuthentication/PasswordAuthenticationConcept.ts
import { Collection, Db } from "npm:mongodb";
import * as crypto from "node:crypto"; // Use Deno's native node:crypto module

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
 * Stored as a PBKDF2 salted hash string: "PBKDF2:{digest}:{iterations}:{salt_b64}:{hash_b64}"
 */
interface UserDoc {
  _id: User; // The ID of the user, generic type
  username: string;
  passwordHash: string;
}

// PBKDF2 parameters for hashing
const PBKDF2_SALT_LENGTH = 16; // 16 bytes for salt
const PBKDF2_KEY_LENGTH = 64; // 64 bytes for derived key
const PBKDF2_ITERATIONS = 100000; // Number of iterations
const PBKDF2_DIGEST = "sha512"; // Hashing algorithm

export default class PasswordAuthenticationConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * internal helpers (implementation detail)
   * hashPassword(password: String) -> String
   *
   * **effects** returns salted hash string (e.g., "PBKDF2:sha512:100000:salt_b64:hash_b64")
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(PBKDF2_SALT_LENGTH);

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        PBKDF2_ITERATIONS,
        PBKDF2_KEY_LENGTH,
        PBKDF2_DIGEST,
        (err, derivedKey) => {
          if (err) {
            return reject(err);
          }
          // Store the parameters used so verification can use them
          const hashString = [
            "PBKDF2",
            PBKDF2_DIGEST,
            PBKDF2_ITERATIONS,
            salt.toString("base64"),
            derivedKey.toString("base64"),
          ].join(":");
          resolve(hashString);
        },
      );
    });
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
    const parts = storedHash.split(":");
    // Expected format: PBKDF2:digest:iterations:salt_b64:hash_b64
    if (parts.length !== 5 || parts[0] !== "PBKDF2") {
      // Not a valid PBKDF2 hash format that we expect
      return false;
    }

    const [_, digest, iterationsStr, saltB64, hashB64] = parts;
    const iterations = parseInt(iterationsStr, 10);

    // Decode base64 components
    const salt = Buffer.from(saltB64, "base64");
    const storedDerivedKey = Buffer.from(hashB64, "base64");

    // Basic validation of parsed components
    if (
      isNaN(iterations) ||
      salt.length !== PBKDF2_SALT_LENGTH ||
      digest !== PBKDF2_DIGEST
    ) {
      return false; // Invalid parameters or digest mismatch
    }

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        iterations,
        storedDerivedKey.length, // Use the length of the stored derived key
        digest,
        (err, derivedKey) => {
          if (err) {
            console.error("Error during password verification:", err);
            // For security, return false rather than exposing internal errors
            return resolve(false);
          }
          // Use timingSafeEqual to prevent timing attacks
          resolve(crypto.timingSafeEqual(derivedKey, storedDerivedKey));
        },
      );
    });
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

    try {
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
    } catch (e) {
      console.error("Error during password hashing for registration:", e);
      return { error: "Failed to securely process password." };
    }
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

    try {
      // Verify the password against the stored hash
      const isPasswordValid = await this.verifyPassword(
        password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        // Return generic error for security reasons
        return { error: "Invalid username or password." };
      }

      // Return the authenticated user's ID
      return { user: user._id };
    } catch (e) {
      console.error("Error during password verification for authentication:", e);
      // Return generic error for security
      return { error: "Invalid username or password." };
    }
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
