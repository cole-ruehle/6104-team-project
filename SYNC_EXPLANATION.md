# How LinkedInImport Sync Works

## The Problem You Found

When you upload a CSV file, `importConnectionsFromCSV` calls `this.addConnection()` directly. This bypasses the instrumented version, so the sync never triggers.

## How Syncs Work

### 1. **Sync Definition** (`src/syncs/linkedinImport.sync.ts`)
```typescript
export const AddLinkedInConnectionToNetwork: Sync = ({
  account, connection, user  // These are SYMBOLS, not values
}) => ({
  when: actions([
    LinkedInImport.addConnection,  // Watch for this action
    { account },                    // Match input pattern
    { connection },                 // Match output pattern
  ]),
  where: async (frames) => {
    // Query to get user from account
    frames = await frames.query(
      LinkedInImport._getAccountUser,
      { account },
      { user },
    );
    return frames;
  },
  then: actions([
    MultiSourceNetwork.addNodeToNetwork,
    { owner: user, node: connection, source: "linkedin" },
  ]),
});
```

### 2. **Sync Registration** (`src/main.ts`)
- Syncs are registered at startup: `Engine.register(syncs)`
- The sync is indexed by the action it watches: `LinkedInImport.addConnection`
- Stored in `Engine.syncsByAction` map

### 3. **Concept Instrumentation** (`src/concepts/concepts.ts`)
- Concepts are wrapped in a Proxy: `Engine.instrumentConcept(concept)`
- When you call `LinkedInImport.addConnection()`, you get an **instrumented wrapper**
- This wrapper intercepts the call and triggers syncs

### 4. **The Issue: Internal Method Calls**

**Before the fix:**
- `importConnectionsFromCSV` calls `this.addConnection()`
- `this` refers to the raw concept instance (not the proxy)
- So `this.addConnection` bypasses instrumentation
- **Result:** Sync never triggers ❌

**After the fix:**
- Changed binding from `value.bind(concept)` to `value.bind(receiver)`
- Now `this.addConnection` goes through the proxy
- **Result:** Sync triggers automatically ✅

## The Fix

**File:** `src/engine/sync.ts` (line 327)

**Changed:**
```typescript
// OLD (bypassed instrumentation):
const action = value.bind(concept);

// NEW (goes through proxy):
const action = value.bind(receiver);
```

This makes `this.addConnection()` inside `importConnectionsFromCSV` go through the instrumented proxy, so syncs trigger.

## Logging Added

1. **Sync Engine Logs** (`src/engine/sync.ts`):
   - `[SyncEngine] Found X sync(s) watching this action`
   - `[SyncEngine] Checking sync: ...`
   - `[SyncEngine] ✓ Pattern matched for sync: ...`
   - `[SyncEngine] Executing 'where' clause...`
   - `[SyncEngine] ✓ 'where' clause returned X frame(s)`
   - `[SyncEngine] Executing 'then' actions...`
   - `[SyncEngine] ✓ Completed sync: ...`

2. **Sync Definition Logs** (`src/syncs/linkedinImport.sync.ts`):
   - `[Sync] AddLinkedInConnectionToNetwork: Processing connection...`
   - `[Sync] AddLinkedInConnectionToNetwork: Found user...`

3. **Import Logs** (`src/concepts/LinkedInImport/LinkedInImportConcept.ts`):
   - `[LinkedInImport] Calling addConnection for row X...`
   - `[LinkedInImport] addConnection completed for row X...`

## Testing

After uploading a CSV, you should now see:
1. `[LinkedInImport] Calling addConnection for row 1...`
2. `[LinkedInImport] addConnection SUCCESS: Created connection...`
3. `[SyncEngine] Found 1 sync(s) watching this action`
4. `[SyncEngine] ✓ Pattern matched for sync: linkedinImport.AddLinkedInConnectionToNetwork`
5. `[Sync] AddLinkedInConnectionToNetwork: Processing connection...`
6. `[Sync] AddLinkedInConnectionToNetwork: Found user...`
7. `[MultiSourceNetwork] addNodeToNetwork SUCCESS: ...`

If you don't see the `[SyncEngine]` logs, the sync isn't being triggered (check that the action is being called through the instrumented version).
