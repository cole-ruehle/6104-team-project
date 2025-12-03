
* **concept**: PublicProfile [User]
* **purpose**: Provide a concise, public-facing description of a user that others can quickly scan and interpret.
* **principle**: When a user creates a public profile with a headline, attributes, and links, anyone can later view that user’s profile and consistently see the same information; if the user updates their profile, viewers will see the updated information the next time it is accessed.

* **state**:
    * a set of `Profiles` with
        * `user` User
        * `headline` String
        * `attributes` set of String
        * `links` set of String

* **actions**:
    * `createProfile (user: User, headline: String, attributes: set of String, links: set of String): Empty`
        * **requires**:
            * No `Profiles` entry exists for `user`.
            * `user` exists.
            * `headline` is not empty.
        * **effects**:
            * Creates a new profile for `user` with the provided headline, attributes, and links.

    * `updateProfile (user: User, headline: String?, attributes: set of String?, links: set of String?): Empty`
        * **requires**:
            * A `Profiles` entry exists for `user`.
            * If `headline` is provided, it is not empty.
        * **effects**: 
            * Updates each provided field on the profile.
            * Leaves unprovided fields unchanged.
            * Overwrites fields if explicitly provided as empty.

    * `deleteProfile (user: User): Empty`
        * **requires**:
            * A `Profiles` entry exists for `user`.
        * **effects**:
            * Removes the profile for `user`.
