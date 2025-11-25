## Logistics
- Date: [Current Date]
- Phase: Alpha 3 (Importing) - Initial Implementation
- Backend Lead: Cole Ruehle
- Frontend Lead: Jing

## Progress Report

### LinkedInImport Concept Implementation

We have completed the initial implementation of the LinkedInImport concept, which enables users to import their LinkedIn connections into the system. The implementation includes:

**Completed Features:**
- CSV import functionality with LLM-powered field mapping
- JSON import functionality with LLM-powered field mapping
- Connection management (add, update connections)
- Import job tracking and status management
- Query methods for retrieving accounts, connections, and import jobs
- Synchronization with MultiSourceNetwork (connections automatically added as nodes)
- Comprehensive test suite for CSV and JSON import

**Technical Implementation:**
- Uses Google Gemini API for intelligent field mapping from CSV/JSON to internal ConnectionDoc structure
- Handles quoted fields, arrays, and nested objects in imported data
- Tracks import progress and errors through ImportJob system
- Stores raw imported data for reference and debugging

## Design Decision: Manual Import vs. API Scraping

### Decision
For the first version of LinkedInImport, we are using **manual CSV/JSON import** rather than automated API scraping or OAuth-based data fetching.

### Rationale

**1. Ethical Considerations:**
- Manual import ensures users have explicit control over what data they share
- Users export their own data from LinkedIn, maintaining clear consent boundaries
- Avoids potential issues with indirect stakeholders (people in networks who aren't users)
- Aligns with our ethical framework of only using public data with explicit user action

**2. Practical Benefits:**
- No dependency on LinkedIn API approval or rate limits
- Works immediately without OAuth setup or partner program enrollment
- Users can review and curate their data before importing
- Reduces risk of violating LinkedIn's terms of service

**3. Technical Advantages:**
- LLM-powered field mapping makes the system flexible to various export formats
- Easier to test and debug with known data sets
- No token management or refresh logic needed for initial version
- Faster development cycle for Alpha 3 milestone

**4. Future Path:**
- The concept structure supports future OAuth-based imports
- Account management actions are already in place for token handling
- Can transition to API-based import once proper permissions and ethical review are completed

### Implementation Scope

**Current Implementation:**
- `importConnectionsFromCSV`: Accepts CSV content, uses LLM to map fields, creates connections
- `importConnectionsFromJSON`: Accepts JSON content, uses LLM to map fields, creates connections
- Both methods create ImportJobs to track progress
- Connections are automatically synced to MultiSourceNetwork via `AddLinkedInConnectionToNetwork` sync

**User Workflow:**
1. User exports their LinkedIn connections as CSV or JSON from LinkedIn's export feature
2. User uploads the file through the application interface
3. System parses the file and uses LLM to intelligently map fields
4. Connections are imported and automatically added to the user's network graph
5. User can view import progress and any errors through ImportJob status

## Integration Points

**With MultiSourceNetwork:**
- Sync automatically adds imported connections as nodes with source "linkedin"
- Enables unified network exploration across all imported sources

**With SemanticSearch (Future):**
- Connection profiles can be indexed for semantic search
- Will enable finding relevant connections through natural language queries

**With PublicProfile (Future):**
- User's own LinkedIn profile data can populate their public profile
- Enables quick profile setup from existing LinkedIn data

## Next Steps

1. **Frontend Integration:**
   - File upload interface for CSV/JSON
   - Import progress visualization
   - Error display and handling

2. **Testing & Refinement:**
   - Test with various LinkedIn export formats
   - Improve LLM field mapping accuracy
   - Handle edge cases in data parsing

3. **Future Enhancements:**
   - OAuth-based API import (after ethical review)
   - Support for other platforms (Instagram, Handshake)
   - Incremental imports (only new/updated connections)
   - Automatic token refresh

## Issues & Blockers

- None currently - implementation is complete and tested

## Plans & Decisions

- **Decision**: Manual import approach for Alpha 3 to ensure ethical compliance and faster delivery
- **Plan**: Frontend team to build file upload and progress UI
- **Future**: Evaluate OAuth-based import for Beta phase after gathering user feedback

