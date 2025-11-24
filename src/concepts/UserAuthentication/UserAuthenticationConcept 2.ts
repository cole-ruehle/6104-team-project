import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

const PREFIX = "UserAuthentication.";
type User = ID;

interface UserDoc {
  _id: User;
  username: string;
  passwordHash: string; // stored as salt:hash
}

export default class UserAuthenticationConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Hashes a password with a random salt.
   */
  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");

    // 100k iterations, 32-byte output, SHA-256
    const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256")
      .toString("hex");

    return `${salt}:${hash}`;
  }

  /**
   * Verifies a plaintext password against a stored hash.
   */
  private verifyPassword(password: string, stored: string): boolean {
    const [salt, storedHash] = stored.split(":");

    const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256")
      .toString("hex");

    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(storedHash, "hex");

    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Register a new user.
   */
  async register({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' already exists.` };
    }

    const passwordHash = this.hashPassword(password);

    const newUser: UserDoc = {
      _id: freshID() as User,
      username,
      passwordHash,
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * Authenticate an existing user.
   */
  async authenticate({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ user: User } | { error: string }> {
    const userDoc = await this.users.findOne({ username });
    if (!userDoc) return { error: "Invalid credentials." };

    const valid = this.verifyPassword(password, userDoc.passwordHash);
    if (!valid) return { error: "Invalid credentials." };

    return { user: userDoc._id };
  }

  /**
   * Internal query to get a user by id.
   * Returns both id and username when found.
   */
  async _getUserById({
    id,
  }: {
    id: User;
  }): Promise<{ id: User; username: string } | Empty> {
    const userDoc = await this.users.findOne({ _id: id });
    return userDoc ? { id: userDoc._id, username: userDoc.username } : {};
  }
}
