---
timestamp: 'Tue Nov 25 2025 04:56:47 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_045647.4242413a.md]]'
content_id: c384b828160c0024e98ee24a2115c411dedb507e5579de3fd433af464898f3cb
---

# response:

This API specification describes the `LinkedInImportConcept` class, which facilitates connecting LinkedIn accounts and importing connection data into a system. It leverages MongoDB for persistence and integrates with an LLM (Gemini) for intelligent data mapping during bulk imports.

***

## LinkedInImport API Specification

### Concept: LinkedInImport

* **Purpose**: Enable users to connect their LinkedIn account and import their connections with associated profile information into the system.
* **Principle**: When a user connects their LinkedIn account via OAuth and initiates an import, the system retrieves their connections and stores the public profile information (name, headline, location, experience, education, skills) for each connection, making this data available for network exploration and semantic search.

***

### Data Models

#### `LinkedInAccountDoc`

Represents a user's connected LinkedIn account.

* `_id`: `LinkedInAccount` (Unique ID for the account)
* `user`: `User` (ID of the user who owns this account)
* `accessToken`: `string` (OAuth access token)
* `refreshToken?`: `string` (OAuth refresh token, optional)
* `expiresAt?`: `Date` (Timestamp when the access token expires, optional)
* `linkedInUserId`: `string` (The unique ID of the user on LinkedIn)
* `linkedInEmail?`: `string` (Email associated with the LinkedIn account, optional)
* `linkedInName?`: `string` (Name of the LinkedIn account holder, optional)
* `createdAt`: `Date` (Timestamp when the account was connected)
* `lastImportedAt?`: `Date` (Timestamp of the last successful import from this account, optional)

#### `ConnectionDoc`

Represents an imported LinkedIn connection's profile information.

* `_id`: `Connection` (Unique ID for the connection within the system)
* `account`: `LinkedInAccount` (The LinkedIn account from which this connection was imported)
* `linkedInConnectionId`: `string` (The unique ID of this connection on LinkedIn)
* `firstName?`: `string` (First name)
* `lastName?`: `string` (Last name)
* `headline?`: `string` (Professional headline)
* `location?`: `string` (Location string)
* `industry?`: `string` (Industry name)
* `currentPosition?`: `string` (Current job title)
* `currentCompany?`: `string` (Current company name)
* `profileUrl?`: `string` (LinkedIn profile URL)
* `profilePictureUrl?`: `string` (Profile picture URL)
* `summary?`: `string` (Profile summary)
* `skills?`: `string[]` (Array of skill strings)
* `education?`: `Array<{ school?: string; degree?: string; fieldOfStudy?: string; startYear?: number; endYear?: number; }>` (Array of education entries)
* `experience?`: `Array<{ title?: string; company?: string; startDate?: string; endDate?: string; description?: string; }>` (Array of experience entries)
* `importedAt`: `Date` (Timestamp when this connection was last imported/updated)
* `rawData?`: `Record<string, unknown>` (Stores the raw LinkedIn API response or parsed raw import data)

#### `ImportJobDoc`

Tracks the status and progress of a LinkedIn connection import operation.

* `_id`: `ImportJob` (Unique ID for the import job)
* `account`: `LinkedInAccount` (The LinkedIn account for which the import is running)
* `status`: `"pending" | "in_progress" | "completed" | "failed"` (Current status of the import)
* `connectionsImported`: `number` (Number of connections successfully imported/updated)
* `connectionsTotal?`: `number` (Total number of connections expected/processed, optional)
* `errorMessage?`: `string` (Error message if the job failed, optional)
* `startedAt`: `Date` (Timestamp when the import job started)
* `completedAt?`: `Date` (Timestamp when the import job completed or failed, optional)

***

### Actions

#### `connectLinkedInAccount`

Connects a LinkedIn account for a user via OAuth and stores the initial tokens and profile information.

* **Parameters**:
  * `user`: `User` (Required) - The ID of the user linking the account.
  * `accessToken`: `string` (Required) - OAuth access token obtained from LinkedIn.
  * `refreshToken?`: `string` (Optional) - OAuth refresh token.
  * `expiresAt?`: `Date` (Optional) - Expiration date of the access token.
  * `linkedInUserId`: `string` (Required) - The unique user ID from LinkedIn for the connected account.
  * `linkedInEmail?`: `string` (Optional) - Email associated with the LinkedIn account.
  * `linkedInName?`: `string` (Optional) - Name of the LinkedIn user.
* **Returns**: `Promise<{ account: LinkedInAccount } | { error: string }>`
  * `account`: The ID of the newly created `LinkedInAccount`.
  * `error`: A string message if an error occurs (e.g., missing required fields, account already exists).
* **Requires**:
  * `accessToken` and `linkedInUserId` must not be empty.
  * No `LinkedInAccount` must exist for the given `user`.
* **Effects**:
  * Creates a new `LinkedInAccountDoc` in the `accounts` collection with the provided details and a `createdAt` timestamp.

#### `updateLinkedInAccount`

Updates the OAuth tokens for an existing LinkedIn account. This is typically used to refresh expired access tokens.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account to update.
  * `accessToken`: `string` (Required) - The new OAuth access token.
  * `refreshToken?`: `string` (Optional) - The new OAuth refresh token.
  * `expiresAt?`: `Date` (Optional) - The new expiration date for the access token.
* **Returns**: `Promise<Empty | { error: string }>`
  * `Empty`: On successful update.
  * `error`: A string message if an error occurs (e.g., account not found, missing access token).
* **Requires**:
  * A `LinkedInAccount` with the given `account` ID must exist.
  * `accessToken` must not be empty.
* **Effects**:
  * Updates the `accessToken`, `refreshToken` (if provided), and `expiresAt` (if provided) fields for the specified `LinkedInAccountDoc`.

#### `disconnectLinkedInAccount`

Removes a LinkedIn account and all associated data from the system.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account to disconnect.
* **Returns**: `Promise<Empty | { error: string }>`
  * `Empty`: On successful disconnection.
  * `error`: A string message if an error occurs (e.g., account not found).
* **Requires**:
  * A `LinkedInAccount` with the given `account` ID must exist.
* **Effects**:
  * Deletes the `LinkedInAccountDoc` from the `accounts` collection.
  * Deletes all `ConnectionDoc`s associated with the account from the `connections` collection.
  * Deletes all `ImportJobDoc`s associated with the account from the `importJobs` collection.

#### `startImport`

Initiates a new import job to fetch connections for a specified LinkedIn account.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account to import connections from.
* **Returns**: `Promise<{ importJob: ImportJob } | { error: string }>`
  * `importJob`: The ID of the newly created `ImportJob`.
  * `error`: A string message if an error occurs (e.g., account not found, expired token).
* **Requires**:
  * A `LinkedInAccount` with the given `account` ID must exist.
  * The `accessToken` for the account must be valid (not expired, if `expiresAt` is set).
* **Effects**:
  * Creates a new `ImportJobDoc` in the `importJobs` collection with `status: "pending"` and a `startedAt` timestamp.

#### `addConnection`

Adds or updates a single connection's profile information in the database. This action is typically called internally during an import process.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account this connection belongs to.
  * `linkedInConnectionId`: `string` (Required) - The unique ID of the connection on LinkedIn.
  * `firstName?`: `string` (Optional)
  * `lastName?`: `string` (Optional)
  * `headline?`: `string` (Optional)
  * `location?`: `string` (Optional)
  * `industry?`: `string` (Optional)
  * `currentPosition?`: `string` (Optional)
  * `currentCompany?`: `string` (Optional)
  * `profileUrl?`: `string` (Optional)
  * `profilePictureUrl?`: `string` (Optional)
  * `summary?`: `string` (Optional)
  * `skills?`: `string[]` (Optional)
  * `education?`: `Array<{ school?: string; degree?: string; fieldOfStudy?: string; startYear?: number; endYear?: number; }>` (Optional)
  * `experience?`: `Array<{ title?: string; company?: string; startDate?: string; endDate?: string; description?: string; }>` (Optional)
  * `rawData?`: `Record<string, unknown>` (Optional) - Raw data from the LinkedIn API or import source.
* **Returns**: `Promise<{ connection: Connection } | { error: string }>`
  * `connection`: The ID of the created or updated `Connection`.
  * `error`: A string message if an error occurs (e.g., missing `linkedInConnectionId`, account not found).
* **Requires**:
  * A `LinkedInAccount` with the given `account` ID must exist.
  * `linkedInConnectionId` must not be empty.
* **Effects**:
  * If a `ConnectionDoc` with the same `account` and `linkedInConnectionId` exists, it updates its fields and `importedAt` timestamp.
  * Otherwise, it creates a new `ConnectionDoc` with the provided information and an `importedAt` timestamp.

#### `updateImportJobStatus`

Updates the status and progress of an ongoing or completed import job.

* **Parameters**:
  * `importJob`: `ImportJob` (Required) - The ID of the import job to update.
  * `status`: `"pending" | "in_progress" | "completed" | "failed"` (Required) - The new status of the job.
  * `connectionsImported`: `number` (Required) - The number of connections processed so far.
  * `connectionsTotal?`: `number` (Optional) - The total number of connections expected.
  * `errorMessage?`: `string` (Optional) - An error message if the job status is "failed".
* **Returns**: `Promise<Empty | { error: string }>`
  * `Empty`: On successful update.
  * `error`: A string message if an error occurs (e.g., job not found, invalid status).
* **Requires**:
  * An `ImportJob` with the given `importJob` ID must exist.
  * `status` must be one of the allowed values.
* **Effects**:
  * Updates the `status`, `connectionsImported`, `connectionsTotal` (if provided), and `errorMessage` (if provided) fields of the specified `ImportJobDoc`.
  * If the `status` is "completed" or "failed", sets the `completedAt` timestamp.
  * If the `status` is "completed", updates the `lastImportedAt` field on the associated `LinkedInAccountDoc`.

#### `importConnectionsFromCSV`

Parses connections from a CSV file, uses an LLM to map CSV columns to `ConnectionDoc` fields, and stores them.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account to associate connections with.
  * `csvContent`: `string` (Required) - The full content of the CSV file as a string.
* **Returns**: `Promise<{ importJob: ImportJob; connectionsImported: number } | { error: string }>`
  * `importJob`: The ID of the created import job.
  * `connectionsImported`: The number of connections successfully imported/updated.
  * `error`: A string message if an error occurs (e.g., account not found, invalid CSV, LLM mapping failure, import errors).
* **Requires**:
  * A `LinkedInAccount` with the given `account` ID must exist.
  * `csvContent` must not be empty.
  * The `GEMINI_API_KEY` environment variable must be set for LLM interaction.
* **Effects**:
  * Creates a new `ImportJobDoc` with `status: "in_progress"`.
  * Parses the `csvContent` into rows and headers.
  * Uses the LLM (via `mapCSVFieldsWithLLM`) to dynamically map CSV headers to `ConnectionDoc` fields.
  * For each row, it constructs `ConnectionDoc` data and calls `addConnection` (which handles upserting).
  * Updates the `ImportJobDoc` status to "completed" or "failed" with details on `connectionsImported`, `connectionsTotal`, and `errorMessage`.
  * If successful, updates `lastImportedAt` on the `LinkedInAccountDoc`.

#### `importConnectionsFromJSON`

Parses connections from a JSON string (expected to be an array of objects), uses an LLM to map JSON keys to `ConnectionDoc` fields, and stores them.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account to associate connections with.
  * `jsonContent`: `string` (Required) - The full JSON content as a string (expects an array of objects or a single object).
* **Returns**: `Promise<{ importJob: ImportJob; connectionsImported: number } | { error: string }>`
  * `importJob`: The ID of the created import job.
  * `connectionsImported`: The number of connections successfully imported/updated.
  * `error`: A string message if an error occurs (e.g., account not found, invalid JSON, LLM mapping failure, import errors).
* **Requires**:
  * A `LinkedInAccount` with the given `account` ID must exist.
  * `jsonContent` must not be empty and must be valid JSON (an object or an array of objects).
  * The `GEMINI_API_KEY` environment variable must be set for LLM interaction.
* **Effects**:
  * Creates a new `ImportJobDoc` with `status: "in_progress"`.
  * Parses the `jsonContent` into an array of objects.
  * Uses the LLM (via `mapJSONFieldsWithLLM`) to dynamically map JSON object keys to `ConnectionDoc` fields.
  * For each object, it constructs `ConnectionDoc` data and calls `addConnection` (which handles upserting).
  * Updates the `ImportJobDoc` status to "completed" or "failed" with details on `connectionsImported`, `connectionsTotal`, and `errorMessage`.
  * If successful, updates `lastImportedAt` on the `LinkedInAccountDoc`.

***

### Queries (Internal/Private)

These methods provide read access to the stored data, typically used internally by the concept or by service layers building upon it. They are marked with an underscore `_` to indicate this.

#### `_getLinkedInAccount`

Retrieves all LinkedIn accounts associated with a specific user.

* **Parameters**:
  * `user`: `User` (Required) - The ID of the user.
* **Returns**: `Promise<LinkedInAccountDoc[]>` - An array of `LinkedInAccountDoc`s.

#### `_getConnections`

Retrieves all connections associated with a specific LinkedIn account.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account.
* **Returns**: `Promise<ConnectionDoc[]>` - An array of `ConnectionDoc`s.

#### `_getConnectionByLinkedInId`

Retrieves a specific connection by its LinkedIn ID for a given account.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account.
  * `linkedInConnectionId`: `string` (Required) - The unique ID of the connection on LinkedIn.
* **Returns**: `Promise<ConnectionDoc[]>` - An array of `ConnectionDoc`s (will typically contain 0 or 1 result).

#### `_getImportJobs`

Retrieves all import jobs associated with a specific LinkedIn account.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account.
* **Returns**: `Promise<ImportJobDoc[]>` - An array of `ImportJobDoc`s.

#### `_getLatestImportJob`

Retrieves the most recent import job for a specific LinkedIn account.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account.
* **Returns**: `Promise<ImportJobDoc[]>` - An array containing the latest `ImportJobDoc` (or empty if none).

#### `_getAccountUser`

Retrieves the user ID associated with a given LinkedIn account.

* **Parameters**:
  * `account`: `LinkedInAccount` (Required) - The ID of the LinkedIn account.
* **Returns**: `Promise<{ user: User }[]>` - An array containing an object with the `user` ID (or empty if account not found).

***

### LLM Integration Details

The `LinkedInImportConcept` uses a Large Language Model (LLM) to intelligently map arbitrary CSV headers or JSON keys from LinkedIn export files to the predefined fields of the `ConnectionDoc` schema.

* **API Key Requirement**: Both `mapJSONFieldsWithLLM` and `mapCSVFieldsWithLLM` (used by `importConnectionsFromJSON` and `importConnectionsFromCSV` respectively) require the `GEMINI_API_KEY` environment variable to be set. This key is used to authenticate requests to the Google Gemini API.
* **Mapping Process**:
  1. The system sends a prompt to the LLM including the available `ConnectionDoc` fields and the extracted CSV headers or JSON keys.
  2. The LLM generates a JSON object where keys are the original input headers/keys and values are the mapped `ConnectionDoc` field names (or `null` if no match).
* **Error Handling**: If the LLM API fails, the API key is missing, or the LLM's response cannot be parsed, the import job will transition to a "failed" status with an appropriate error message.
* **Flexibility**: This LLM-driven mapping allows the system to be resilient to variations in LinkedIn export formats or custom data structures, reducing the need for hardcoded mappings.

***
