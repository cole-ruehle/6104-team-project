# Sync Flow Explanation: LinkedInImport → MultiSourceNetwork

## Overview
When a LinkedIn connection is added, a synchronization automatically creates a membership in MultiSourceNetwork. Here's the complete flow:

---

## Step-by-Step Flow

### **Step 1: Sync Definition**
**Location:** `src/syncs/linkedinImport.sync.ts`

The sync is defined as:
```typescript
export const AddLinkedInConnectionToNetwork: Sync = ({
  account,    // Symbol variable
  connection, // Symbol variable
  user,       // Symbol variable
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
    MultiSourceNetwork.addNodeToNetwork,  // Call this action
    {
      owner: user,
      node: connection,
      source: "linkedin" as ID,
    },
  ]),
});
```

---

### **Step 2: Sync Registration**
**Location:** `src/main.ts` (line 25)

```typescript
Engine.register(syncs);  // Registers all syncs from src/syncs/
```

**What happens:**
- `src/syncs/syncs.ts` auto-imports all `.sync.ts` files
- Each sync function is called with `$vars` to create the sync declaration
- The sync is indexed by the action it watches (`LinkedInImport.addConnection`)
- Stored in `Engine.syncsByAction` map

**Function:** `SyncConcept.register()` in `src/engine/sync.ts` (line 63-78)

---

### **Step 3: Concept Instrumentation**
**Location:** `src/concepts/concepts.ts` (line 27)

```typescript
export const LinkedInImport = Engine.instrumentConcept(new LinkedInImportConcept(db));
```

**What happens:**
- `instrumentConcept()` wraps the concept in a Proxy
- When you access `LinkedInImport.addConnection`, it returns an **instrumented wrapper function**
- This wrapper intercepts all action calls

**Function:** `SyncConcept.instrumentConcept()` in `src/engine/sync.ts` (line 281-368)

---

### **Step 4: Action Call (Instrumented)**
**When:** `LinkedInImport.addConnection({ account, linkedInConnectionId, ... })` is called

**Location:** `src/engine/sync.ts` (line 312-350)

The instrumented wrapper function:
```typescript
instrumented = async function instrumented(args: ActionArguments) {
  // 1. Extract flow token, input, etc.
  const actionRecord = {
    id,
    action: instrumented,
    concept,
    input,
    synced: syncedMap,
    flow: flowToken,
  };

  // 2. Record that action was invoked
  Action.invoke(actionRecord);

  // 3. Execute the actual action
  const output = await action(input);  // Calls LinkedInImportConcept.addConnection()

  // 4. Record that action completed
  Action.invoked({ id, output });

  // 5. ⭐ TRIGGER SYNC HERE ⭐
  await synchronize({ ...actionRecord, output });

  return output;
};
```

**Function:** `SyncConcept.instrumentConcept()` creates this wrapper

---

### **Step 5: Sync Trigger**
**Location:** `src/engine/sync.ts` (line 79-124)

**Function:** `SyncConcept.synchronize(record: ActionRecord)`

```typescript
async synchronize(record: ActionRecord) {
  // 1. Get all syncs watching this action
  const syncs = await this.syncsByAction.get(record.action);

  if (syncs) {
    for (const sync of syncs) {
      // 2. Match the "when" pattern
      let [frames, actionSymbols] = await this.matchWhen(record, sync);

      if (frames.length > 0) {
        // 3. Execute "where" clause (if present)
        if (sync.where !== undefined) {
          frames = await sync.where(frames);
        }

        // 4. Execute "then" actions
        await this.addThen(frames, sync, actionSymbols);
      }
    }
  }
}
```

---

### **Step 6: Pattern Matching**
**Location:** `src/engine/sync.ts` (line 130-166)

**Function:** `SyncConcept.matchWhen(record, sync)`

**What it does:**
1. Gets all actions in the same flow (same request/transaction)
2. Checks if any action matches the `when` pattern:
   - Action must be `LinkedInImport.addConnection`
   - Input must have `account` field
   - Output must have `connection` field
3. Creates "frames" with matched values bound to symbols

---

### **Step 7: Where Clause Execution**
**Location:** `src/syncs/linkedinImport.sync.ts` (line 25-42)

**Function:** The `where` function from the sync definition

```typescript
where: async (frames) => {
  // Query to get the user (owner) from the LinkedIn account
  frames = await frames.query(
    LinkedInImport._getAccountUser,  // Query function
    { account },                      // Input: account symbol
    { user },                         // Output: user symbol
  );
  return frames;  // Returns frames with user bound
}
```

**What happens:**
- Takes the `account` value from the frame
- Calls `LinkedInImport._getAccountUser({ account })`
- Binds the returned `user` to the frame
- If no user found, returns empty frames (sync won't execute)

---

### **Step 8: Then Actions Execution**
**Location:** `src/engine/sync.ts` (line 167-212)

**Function:** `SyncConcept.addThen(frames, sync, actionSymbols)`

```typescript
async addThen(frames, sync, actionSymbols) {
  for (const frame of frames) {
    for (const then of sync.then) {
      // 1. Match the "then" pattern with frame values
      const matched = this.matchThen(then, frame);

      // 2. Extract the action and arguments
      thens.push([then.action, matched]);
    }
  }

  // 3. Execute all "then" actions
  for (const [thenAction, thenRecord] of thens) {
    await thenAction(thenRecord);  // Calls MultiSourceNetwork.addNodeToNetwork()
  }
}
```

**What happens:**
- Takes values from frames (`user`, `connection`)
- Creates arguments: `{ owner: user, node: connection, source: "linkedin" }`
- Calls `MultiSourceNetwork.addNodeToNetwork()` with these arguments

---

### **Step 9: Final Action Execution**
**Location:** `src/concepts/MultiSourceNetwork/MultiSourceNetworkConcept.ts` (line 162-184)

**Function:** `MultiSourceNetworkConcept.addNodeToNetwork()`

```typescript
async addNodeToNetwork({ owner, node, source }) {
  const membership = await this.memberships.findOne({ owner, node });
  if (!membership) {
    // Create new membership
    await this.memberships.insertOne({
      _id: freshID(),
      owner,
      node,
      sources: { [source]: true },
    });
  } else {
    // Update existing membership
    await this.memberships.updateOne(
      { owner, node },
      { $set: { [`sources.${source}`]: true } },
    );
  }
}
```

**Result:** A membership is created/updated in MongoDB with:
- `owner`: The user who owns the LinkedIn account
- `node`: The connection ID (same as the Connection ID from LinkedInImport)
- `sources.linkedin`: true

---

## Summary Flow Diagram

```
1. LinkedInImport.addConnection() called
   ↓
2. Instrumented wrapper intercepts call
   ↓
3. Actual addConnection() executes → saves to MongoDB
   ↓
4. synchronize() called with action record
   ↓
5. Engine finds syncs watching addConnection
   ↓
6. matchWhen() checks if pattern matches
   ↓
7. where() clause queries for user from account
   ↓
8. addThen() executes MultiSourceNetwork.addNodeToNetwork()
   ↓
9. Membership created in MultiSourceNetwork with source "linkedin"
```

---

## Key Files & Functions

| Step | File | Function | Purpose |
|------|------|----------|---------|
| Definition | `src/syncs/linkedinImport.sync.ts` | `AddLinkedInConnectionToNetwork` | Defines when/what to sync |
| Registration | `src/main.ts` | `Engine.register(syncs)` | Registers syncs at startup |
| Instrumentation | `src/concepts/concepts.ts` | `Engine.instrumentConcept()` | Wraps concepts in Proxy |
| Interception | `src/engine/sync.ts` | `instrumentConcept()` wrapper | Intercepts action calls |
| Trigger | `src/engine/sync.ts` | `synchronize()` | Finds and executes matching syncs |
| Matching | `src/engine/sync.ts` | `matchWhen()` | Matches action patterns |
| Query | `src/syncs/linkedinImport.sync.ts` | `where()` clause | Gets user from account |
| Execution | `src/engine/sync.ts` | `addThen()` | Executes "then" actions |
| Result | `src/concepts/MultiSourceNetwork/...` | `addNodeToNetwork()` | Creates membership |

---

## Important Notes

1. **Only instrumented actions trigger syncs**: If you call `this.addConnection()` directly inside a concept method, it bypasses instrumentation and won't trigger syncs.

2. **Sync happens AFTER action completes**: The sync executes after the original action returns its output.

3. **Frames are the binding mechanism**: Frames bind symbol variables (like `account`, `connection`, `user`) to actual values.

4. **Flow tokens group actions**: All actions in the same request share a flow token, allowing syncs to match related actions.
