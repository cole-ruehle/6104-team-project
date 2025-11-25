* **concept**: LinkedInImport [User]
* **purpose**: Enable users to import their LinkedIn connections and associated profile information into the system, making this data available for network exploration and semantic search.
* **principle**: If a user exports their LinkedIn connections as CSV or JSON and imports them into the system, then the system uses LLM-powered field mapping to parse and store the connection data, and these connections are automatically added to their unified network graph.

* **state**:
    * a set of `LinkedInAccounts` with
        * `user` User
        * `accessToken` String
        * `refreshToken` String?
        * `expiresAt` Date?
        * `linkedInUserId` String
        * `linkedInEmail` String?
        * `linkedInName` String?
        * `createdAt` Date
        * `lastImportedAt` Date?
    * a set of `Connections` with
        * `account` LinkedInAccount
        * `linkedInConnectionId` String
        * `firstName` String?
        * `lastName` String?
        * `headline` String?
        * `location` String?
        * `industry` String?
        * `currentPosition` String?
        * `currentCompany` String?
        * `profileUrl` String?
        * `profilePictureUrl` String?
        * `summary` String?
        * `skills` set of String?
        * `education` JSON?
        * `experience` JSON?
        * `importedAt` Date
        * `rawData` JSON?
    * a set of `ImportJobs` with
        * `account` LinkedInAccount
        * `status` String (pending, in_progress, completed, failed)
        * `connectionsImported` Number
        * `connectionsTotal` Number?
        * `errorMessage` String?
        * `startedAt` Date
        * `completedAt` Date?

* **actions**:

    * `connectLinkedInAccount (user: User, accessToken: String, refreshToken: String?, expiresAt: Date?, linkedInUserId: String, linkedInEmail: String?, linkedInName: String?): (account: LinkedInAccount)`
        * **requires**:
            * No `LinkedInAccounts` entry exists for `user`.
            * `accessToken` is not empty.
            * `linkedInUserId` is not empty.
        * **effects**:
            * Creates a new `LinkedInAccounts` entry for the user with the provided OAuth tokens and profile information.
            * Returns the account ID.

    * `updateLinkedInAccount (account: LinkedInAccount, accessToken: String, refreshToken: String?, expiresAt: Date?): Empty`
        * **requires**:
            * A `LinkedInAccounts` entry with the given `account` ID exists.
            * `accessToken` is not empty.
        * **effects**:
            * Updates the `accessToken`, `refreshToken`, and `expiresAt` fields for the account.

    * `disconnectLinkedInAccount (account: LinkedInAccount): Empty`
        * **requires**:
            * A `LinkedInAccounts` entry with the given `account` ID exists.
        * **effects**:
            * Removes the `LinkedInAccounts` entry and all associated `Connections` and `ImportJobs`.

    * `importConnectionsFromCSV (account: LinkedInAccount, csvContent: String): (importJob: ImportJob, connectionsImported: Number)`
        * **requires**:
            * A `LinkedInAccounts` entry with the given `account` ID exists.
            * `csvContent` is not empty.
        * **effects**:
            * Parses the CSV content.
            * Uses LLM to map CSV columns to ConnectionDoc fields.
            * Creates an `ImportJobs` entry with status "in_progress".
            * Processes each CSV row and calls `addConnection` for each.
            * Updates `ImportJobs` status to "completed" or "failed".
            * Returns the importJob ID and number of connections imported.

    * `importConnectionsFromJSON (account: LinkedInAccount, jsonContent: String): (importJob: ImportJob, connectionsImported: Number)`
        * **requires**:
            * A `LinkedInAccounts` entry with the given `account` ID exists.
            * `jsonContent` is not empty and is valid JSON.
        * **effects**:
            * Parses the JSON content (expects an array of connection objects or a single object).
            * Uses LLM to map JSON keys to ConnectionDoc fields.
            * Creates an `ImportJobs` entry with status "in_progress".
            * Processes each JSON object and calls `addConnection` for each.
            * Updates `ImportJobs` status to "completed" or "failed".
            * Returns the importJob ID and number of connections imported.

    * `addConnection (account: LinkedInAccount, linkedInConnectionId: String, firstName: String?, lastName: String?, headline: String?, location: String?, industry: String?, currentPosition: String?, currentCompany: String?, profileUrl: String?, profilePictureUrl: String?, summary: String?, skills: set of String?, education: JSON?, experience: JSON?, rawData: JSON?): (connection: Connection)`
        * **requires**:
            * A `LinkedInAccounts` entry with the given `account` ID exists.
            * `linkedInConnectionId` is not empty.
        * **effects**:
            * Creates or updates a `Connections` entry with the provided information.
            * If a connection with the same `account` and `linkedInConnectionId` exists, updates it.
            * Returns the connection ID.

    * `updateImportJobStatus (importJob: ImportJob, status: String, connectionsImported: Number, connectionsTotal: Number?, errorMessage: String?): Empty`
        * **requires**:
            * An `ImportJobs` entry with the given `importJob` ID exists.
            * `status` is one of: "pending", "in_progress", "completed", "failed".
        * **effects**:
            * Updates the import job's status, progress, and optional error message.
            * Sets `completedAt` if status is "completed" or "failed".
            * Updates `lastImportedAt` on the account if status is "completed".

* **queries**:

    * `_getLinkedInAccount (user: User): (account: LinkedInAccount)`
        * **requires**: true
        * **effects**: Returns all LinkedIn accounts for the user.

    * `_getConnections (account: LinkedInAccount): (connection: Connection)`
        * **requires**: true
        * **effects**: Returns all connections for the LinkedIn account.

    * `_getConnectionByLinkedInId (account: LinkedInAccount, linkedInConnectionId: String): (connection: Connection)`
        * **requires**: true
        * **effects**: Returns connections matching the LinkedIn connection ID.

    * `_getImportJobs (account: LinkedInAccount): (importJob: ImportJob)`
        * **requires**: true
        * **effects**: Returns all import jobs for the LinkedIn account.

    * `_getLatestImportJob (account: LinkedInAccount): (importJob: ImportJob)`
        * **requires**: true
        * **effects**: Returns the most recent import job for the LinkedIn account.

    * `_getAccountUser (account: LinkedInAccount): (user: User)`
        * **requires**: true
        * **effects**: Returns the user (owner) for the LinkedIn account.

* **notes**:
    * The first version uses manual CSV/JSON import from LinkedIn's export feature rather than API scraping, ensuring ethical data handling and avoiding API limitations.
    * LLM-powered field mapping allows the system to intelligently interpret various CSV/JSON formats that users may export from LinkedIn.
    * Connections are automatically added to MultiSourceNetwork via synchronization when `addConnection` is called.
    * The concept supports future expansion to OAuth-based API imports once proper permissions and ethical considerations are addressed.

