* **concept**: PasswordAuthentication
* **purpose**: Provide username/password–based registration and authentication.
* **principle**: After a user registers with a username and password, they can authenticate using the same credentials. Passwords are stored as salted, hashed values. Helper functions for hashing and verifying passwords are internal.

* **state**:
    * a set of `Users` with
        * `id` User
        * `username` String
        * `passwordHash` String (stored as `"salt:hash"`)

* **actions**:

    * `register(username: String, password: String): { user: User }`
        * **requires**:
            * Username does not already exist
        * **effects**:
            * Creates a new user with a salted + hashed password and returns the new user’s id

    * `authenticate(username: String, password: String): { user: User }`
        * **requires**:
            * Username exists **and** password matches stored hash
        * **effects**:
            * Returns the authenticated user’s id

    * `searchUsers(query: String, limit?: Number): { users: seq of { id: User, username: String } }`
        * **requires**:
            * None
        * **effects**:
            * Performs a case-insensitive search of usernames and returns up to `limit` matches (default 10)

* **internal helpers** (implementation detail):

    * `hashPassword(password: String): String`
        * **effects**:
            * Returns a salted password hash formatted as `"salt:hash"`

    * `verifyPassword(password: String, stored: String): Boolean`
        * **effects**:
            * Verifies a plaintext password against the stored salted hash using a timing-safe comparison

* **queries**:

    * `_getUserById(id: User): { id: User, username: String } | Empty`
        * **effects**:
            * Returns the user’s id and username when found
