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

// 4. Fetch and add connections (this would typically be done in a sync or background job)
await LinkedInImport.updateImportJobStatus({
  importJob,
  status: "in_progress",
  connectionsImported: 0,
});

const connections = await getConnections(tokenData.access_token);
for (const connection of connections) {
  await LinkedInImport.addConnection({
    account,
    linkedInConnectionId: connection.id,
    ...transformProfileToConnection(connection),
  });
}

await LinkedInImport.updateImportJobStatus({
  importJob,
  status: "completed",
  connectionsImported: connections.length,
  connectionsTotal: connections.length,
});
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
- **SemanticSearch**: Connection profiles can be indexed for semantic search
- **PublicProfile**: User's own LinkedIn profile can be used to populate their public profile

## Future Enhancements

- Automatic token refresh
- Incremental imports (only fetch new/updated connections)
- Support for additional LinkedIn data fields
- Batch import operations
- Error recovery and retry logic

