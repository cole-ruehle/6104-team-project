# LinkedInImport Concept

## Purpose

The LinkedInImport concept enables users to connect their LinkedIn account via OAuth and import their connections with associated profile information into the system. This imported data can then be used by other concepts (such as MultiSourceNetwork) to build a unified network graph.

## Principle

When a user connects their LinkedIn account via OAuth and initiates an import, the system retrieves their connections and stores the public profile information (name, headline, location, experience, education, skills) for each connection, making this data available for network exploration and semantic search.

## State

The concept maintains three collections:

1. **LinkedInAccounts**: Stores OAuth tokens and account information for each connected LinkedIn account
2. **Connections**: Stores imported connection profiles with all available LinkedIn data
3. **ImportJobs**: Tracks import operations and their status

## Actions

### `connectLinkedInAccount`
Connects a LinkedIn account via OAuth tokens. Creates a new account record.

**Input**: `user`, `accessToken`, `refreshToken?`, `expiresAt?`, `linkedInUserId`, `linkedInEmail?`, `linkedInName?`

**Output**: `{ account: LinkedInAccount }` or `{ error: string }`

### `updateLinkedInAccount`
Updates OAuth tokens for an existing account (e.g., after token refresh).

**Input**: `account`, `accessToken`, `refreshToken?`, `expiresAt?`

**Output**: `{}` or `{ error: string }`

### `disconnectLinkedInAccount`
Removes a LinkedIn account and all associated connections and import jobs.

**Input**: `account`

**Output**: `{}` or `{ error: string }`

### `startImport`
Creates a new import job to fetch connections from LinkedIn.

**Input**: `account`

**Output**: `{ importJob: ImportJob }` or `{ error: string }`

### `addConnection`
Adds or updates a connection in the database. Typically called during import operations.

**Input**: `account`, `linkedInConnectionId`, and various optional profile fields

**Output**: `{ connection: Connection }` or `{ error: string }`

### `importConnectionsFromCSV`
Imports connections from a CSV payload. Uses an LLM helper to map CSV columns to the internal
ConnectionDoc shape, calls `addConnection` for each row, and returns the import job plus the
created connection documents.

**Input**: `account`, `csvContent` (string)

**Output**: `{ importJob: ImportJob; connectionsImported: number; connections: ConnectionDoc[] }` or `{ error: string }`

### `importConnectionsFromJSON`
Imports connections from a JSON string representing an array of connection objects. Works like
the CSV importer but maps JSON keys to ConnectionDoc fields via the LLM helper and returns the
created connection documents.

**Input**: `account`, `jsonContent` (string)

**Output**: `{ importJob: ImportJob; connectionsImported: number; connections: ConnectionDoc[] }` or `{ error: string }`

### `updateImportJobStatus`
Updates the status and progress of an import job.

**Input**: `importJob`, `status`, `connectionsImported`, `connectionsTotal?`, `errorMessage?`

**Output**: `{}` or `{ error: string }`

## Queries

- `_getLinkedInAccount(user)`: Get LinkedIn account for a user
- `_getConnections(account)`: Get all connections for an account
- `_getConnectionByLinkedInId(account, linkedInConnectionId)`: Find a specific connection
- `_getImportJobs(account)`: Get all import jobs for an account
- `_getLatestImportJob(account)`: Get the most recent import job

## Usage Example

```typescript
import LinkedInImport from "@concepts/LinkedInImport/LinkedInImportConcept.ts";
import { exchangeCodeForToken, getCurrentUserProfile, getConnections, transformProfileToConnection } from "@concepts/LinkedInImport/linkedinApi.ts";

// 1. Exchange OAuth code for tokens
const tokenData = await exchangeCodeForToken(authCode);
const profile = await getCurrentUserProfile(tokenData.access_token);

// 2. Connect the account
const { account } = await LinkedInImport.connectLinkedInAccount({
  user: userId,
  accessToken: tokenData.access_token,
  refreshToken: tokenData.refresh_token,
  expiresAt: tokenData.expires_in 
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : undefined,
  linkedInUserId: profile.id,
  linkedInEmail: await getCurrentUserEmail(tokenData.access_token),
  linkedInName: `${profile.firstName?.localized?.[Object.keys(profile.firstName.localized)[0]]} ${profile.lastName?.localized?.[Object.keys(profile.lastName?.localized || {})[0]]}`,
});

// 3. Start import
const { importJob } = await LinkedInImport.startImport({ account });

// 4. Import connections (CSV or JSON)
//
// The concept provides convenience actions for importing many connections at once.
// `importConnectionsFromCSV` accepts a CSV string and returns the import job plus
// an array of the created `ConnectionDoc` objects. `importConnectionsFromJSON` does
// the same for a JSON array input.

await LinkedInImport.updateImportJobStatus({ importJob, status: "in_progress", connectionsImported: 0 });

// Example: import from CSV content
const csvContent = /* string payload from uploaded CSV */ "...";
const csvResult = await LinkedInImport.importConnectionsFromCSV({ account, csvContent });
if ("error" in csvResult) {
  // handle import error
  console.error("Import failed:", csvResult.error);
} else {
  // csvResult.connections contains the created ConnectionDoc[] for downstream processing
  console.log(`Imported ${csvResult.connectionsImported} connections, sample:`, csvResult.connections.slice(0, 3));
}

await LinkedInImport.updateImportJobStatus({
  importJob,
  status: "completed",
  connectionsImported: Array.isArray(csvResult?.connections) ? csvResult.connections.length : 0,
  connectionsTotal: Array.isArray(csvResult?.connections) ? csvResult.connections.length : undefined,
});

// Note: A synchronization (`src/syncs/linkedinImport.create_nodes.sync.ts`) listens for
// the import action (the CSV importer) and will create canonical MultiSourceNetwork
// nodes for each returned connection and upsert an owner -> node edge. This means
// callers typically do not need to manually create canonical nodes after an import;
// the sync will run and call `MultiSourceNetwork.addOrMigrateNodeFromSource` for each
// imported connection.
```

## LinkedIn API Integration

The `linkedinApi.ts` helper module provides utilities for:
- OAuth flow (authorization URL, token exchange)
- Fetching user profile and email
- Fetching connections (requires LinkedIn Partner approval)
- Transforming LinkedIn API responses to concept format

**Important Notes:**
- LinkedIn's Connections API requires special partner approval
- The current implementation includes placeholder functions for connection fetching
- You'll need to set up LinkedIn OAuth credentials in environment variables:
  - `LINKEDIN_CLIENT_ID`
  - `LINKEDIN_CLIENT_SECRET`
  - `LINKEDIN_REDIRECT_URI`

## Integration with Other Concepts

This concept is designed to work with:
- **MultiSourceNetwork**: Imported connections can be added as nodes with source "linkedin"
  - A sync (see `src/syncs/linkedinImport.create_nodes.sync.ts`) listens for the import actions
    (`importConnectionsFromCSV` / `importConnectionsFromJSON`) and, for each returned connection,
    calls `MultiSourceNetwork.addOrMigrateNodeFromSource` to create or merge a canonical node and
    upsert an owner → node edge. This makes imported connections show up in the owner's network
    automatically.
- **SemanticSearch**: Connection profiles can be indexed for semantic search
- **PublicProfile**: User's own LinkedIn profile can be used to populate their public profile

## Future Enhancements

- Automatic token refresh
- Incremental imports (only fetch new/updated connections)
- Support for additional LinkedIn data fields
- Batch import operations
- Error recovery and retry logic
