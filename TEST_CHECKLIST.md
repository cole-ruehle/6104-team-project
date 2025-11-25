# Pre-PR Test Checklist for LinkedInImport

## Prerequisites

**Required Environment Variables:**
Create a `.env` file in the project root with:
```bash
MONGODB_URL=mongodb://localhost:27017
DB_NAME=FrontEnd
GEMINI_API_KEY=your_key_here  # Optional for full LLM testing
```

Or export them:
```bash
export MONGODB_URL="mongodb://localhost:27017"
export DB_NAME="FrontEnd"
export GEMINI_API_KEY="your_key_here"  # Optional
```

## Quick Test Commands

### 1. Run Unit Tests
```bash
deno test src/concepts/LinkedInImport/LinkedInImportConcept.test.ts --allow-net --allow-read --allow-write --allow-env --allow-sys
```

### 2. Run All Concept Tests
```bash
deno test src/concepts/ --allow-net --allow-read --allow-write --allow-env --allow-sys
```

### 3. Build/Import Generation (if syncs changed)
```bash
deno task build
```

### 4. Check Linting
```bash
deno lint src/concepts/LinkedInImport/ src/syncs/linkedinImport.sync.ts
```

---

## Essential Tests to Verify

### ✅ Unit Tests (Automated)

**CSV Import:**
- [ ] Basic CSV parsing works
- [ ] Empty CSV returns error
- [ ] Invalid account returns error
- [ ] Quoted fields with commas handled correctly

**JSON Import:**
- [ ] Basic JSON array parsing works
- [ ] Single JSON object (wrapped) works
- [ ] Empty JSON returns error
- [ ] Invalid JSON returns error
- [ ] Arrays (skills, education, experience) handled correctly

**Account Management:**
- [ ] Connect account succeeds
- [ ] Connect duplicate account fails
- [ ] Update account works
- [ ] Disconnect account removes connections

**Queries:**
- [ ] `_getAccountUser` returns correct user
- [ ] `_getConnections` returns connections
- [ ] `_getImportJobs` returns jobs

### ✅ Integration Tests (Manual - Run with GEMINI_API_KEY set)

**CSV Import with LLM:**
```bash
# Set GEMINI_API_KEY in .env or export
export GEMINI_API_KEY="your-key-here"

# Test with real CSV
deno test src/concepts/LinkedInImport/LinkedInImportConcept.test.ts --allow-net --allow-read --allow-write --allow-env --allow-sys
```

**Test CSV Format:**
```csv
First Name,Last Name,Headline,Location,Company
John,Doe,Software Engineer,San Francisco,Tech Corp
Jane,Smith,Product Manager,New York,Startup Inc
```

**Test JSON Format:**
```json
[
  {
    "first_name": "John",
    "last_name": "Doe",
    "headline": "Software Engineer",
    "location": "San Francisco",
    "current_company": "Tech Corp"
  },
  {
    "first_name": "Jane",
    "last_name": "Smith",
    "headline": "Product Manager",
    "location": "New York"
  }
]
```

### ✅ Sync Integration Test (Manual)

**Test that connections sync to MultiSourceNetwork:**

1. Start the server:
```bash
deno task start
```

2. Create account and import:
```bash
# POST /api/LinkedInImport/connectLinkedInAccount
{
  "user": "user:test",
  "accessToken": "test_token",
  "linkedInUserId": "test_id"
}

# POST /api/LinkedInImport/importConnectionsFromCSV
{
  "account": "<account_id_from_above>",
  "csvContent": "First Name,Last Name\nJohn,Doe"
}
```

3. Verify sync worked:
```bash
# Check that node was added to network
# Query MultiSourceNetwork to see if connection appears as node with source "linkedin"
```

### ✅ Edge Cases

- [ ] CSV with missing columns (LLM should handle gracefully)
- [ ] CSV with extra columns (should be ignored or stored in rawData)
- [ ] JSON with nested objects (education, experience arrays)
- [ ] Large CSV (100+ rows) - verify performance
- [ ] Import job status updates correctly
- [ ] Multiple imports for same account (should update existing connections)

### ✅ Error Handling

- [ ] Invalid account ID returns error
- [ ] Empty CSV/JSON returns error
- [ ] Malformed CSV/JSON returns error
- [ ] Missing GEMINI_API_KEY returns clear error
- [ ] LLM API failure handled gracefully

---

## Quick Smoke Test Script

Run this to verify basic functionality:

```bash
#!/bin/bash
# Quick smoke test

# Make sure .env is set up or export variables
if [ -z "$MONGODB_URL" ]; then
  echo "⚠️  MONGODB_URL not set. Make sure .env file exists or export it."
  exit 1
fi

echo "1. Running unit tests..."
deno test src/concepts/LinkedInImport/LinkedInImportConcept.test.ts --allow-net --allow-read --allow-write --allow-env --allow-sys

echo "2. Checking lint..."
deno lint src/concepts/LinkedInImport/ src/syncs/linkedinImport.sync.ts

echo "3. Building imports..."
deno task build

echo "✅ Basic checks complete!"
```

---

## Critical Path Test (Must Pass)

**Minimum viable test:**
1. ✅ Create LinkedIn account
2. ✅ Import CSV with 2-3 connections
3. ✅ Verify connections exist in database
4. ✅ Verify connections appear in MultiSourceNetwork (via sync)
5. ✅ Verify import job shows "completed" status

If this critical path works, the core functionality is solid.

---

## Notes

- **Environment Setup**: Tests require `MONGODB_URL` and `DB_NAME` in `.env` file or exported
- **LLM Tests**: Some tests will skip LLM calls if `GEMINI_API_KEY` is not set - this is expected
- **Sync Tests**: May need to manually verify sync works by checking MultiSourceNetwork after import
- **Performance**: For large imports (1000+ connections), test that it completes in reasonable time

## Troubleshooting

**Error: "Could not find environment variable: MONGODB_URL"**
- Create a `.env` file in project root with `MONGODB_URL` and `DB_NAME`
- Or export them: `export MONGODB_URL="mongodb://localhost:27017"`

**Error: "MongoDB connection failed: bad auth : authentication failed"**

This means your MongoDB connection string has authentication issues. Fix based on your setup:

**For Local MongoDB (no auth):**
```bash
# In .env file:
MONGODB_URL=mongodb://localhost:27017
DB_NAME=FrontEnd
```

**For Local MongoDB (with auth):**
```bash
# In .env file:
MONGODB_URL=mongodb://username:password@localhost:27017
DB_NAME=FrontEnd
```

**For MongoDB Atlas (cloud):**
```bash
# In .env file:
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=FrontEnd
```

**Quick Fix - Test with local MongoDB:**
1. Make sure MongoDB is running: `brew services start mongodb-community` (macOS) or check your system
2. If you don't have auth enabled, use: `MONGODB_URL=mongodb://localhost:27017`
3. If you have auth enabled, include credentials: `MONGODB_URL=mongodb://user:pass@localhost:27017`

**Verify MongoDB is running:**
```bash
# Check if MongoDB is running
mongosh --eval "db.version()"  # or `mongo` for older versions
```

**MongoDB Connection String Formats:**
- No auth: `mongodb://localhost:27017`
- With auth: `mongodb://username:password@localhost:27017`
- Atlas: `mongodb+srv://username:password@cluster.mongodb.net/`
