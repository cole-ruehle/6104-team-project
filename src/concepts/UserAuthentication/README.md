* **concept**: UserAuthentication [User]
* **purpose**: Provide username/password based registration and authentication.
* **principle**: After a user registers with a username and password they can authenticate using the same credentials. Passwords are stored hashed with a salt. Helper functions to hash and verify passwords are internal implementation details and should use timing-safe comparisons.

* **state**:
	* a set of `Users` with
		* `id` User
		* `username` String
		* `passwordHash` String (stored as `salt:hash`)

* **actions**:
	* `register(username: String, password: String): { user }`
		* **requires**: `username` does not already exist
		* **effects**: creates a new user with a salted+hashed password and returns the new user id

	* `authenticate(username: String, password: String): { user }`
		* **requires**: `username` exists and `password` matches stored hash
		* **effects**: returns the authenticated user's id

	* `searchUsers(query: String, limit?: Number): { users }`
		* **requires**: none
		* **effects**: performs a case-insensitive search of usernames and returns up to `limit` matches (default 10)

	* `hashPassword(password: String) -> String`
		* **effects**: returns a salted hash string in the format `salt:hash`

	* `verifyPassword(password: String, stored: String) -> Boolean`
		* **effects**: verifies a plaintext password against the stored salted hash using a timing-safe comparison
