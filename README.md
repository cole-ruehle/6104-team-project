# 6104-team-project

### Team Contract
[Team Contract](team-contract.md)

### Problem Framing
[Problem Framing](problem-framing.md)

### Functional Design
- [Functional Design — Alpha](functional-design-alpha.md)
- [Functional Design — Beta](functional-design-beta.md)

### Development Plans
- [Development Plan — Alpha](development-plan-alpha.md)
- [Development Plan — Beta](development-plan-beta.md)

### Project Updates
- [Update 1](project-updates/update-1.md)
- [Update 2](project-updates/update-2.md)
- [Update 3](project-updates/update-3.md)
- [Update 4](project-updates/update-4.md)

<br>

# Beta Checkpoint

### Summary of Beta Updates
- **Core concepts implemented in the backend**: `PublicProfile`, `UserAuthentication`, `MultiSourceNetwork`, `LinkedInImport`, and `SemanticSearch` are implemented as working backend concepts and surfaced via the API.
- **Graph visualization working in the frontend**: Users can see a network graph of their imported connections with a zoomable, pannable vis-network view, and basic node-level inspection.
- **LinkedIn CSV import path is functional**: A user can upload a LinkedIn connections CSV, the backend maps CSV columns to our schema (with help from an LLM for inferring missing semantics), and those profiles are stored in MongoDB and added to the user’s network.
- **Semantic search is integrated with the network**: Users can run natural-language queries over their imported connections; the system uses txtai embeddings to rank relevant profiles and can highlight them in the graph.
- **Sync behavior is partially realized**: We index connections into the semantic search service and can reindex on demand, but many of the richer sync flows (e.g., automatically updating networks when profiles change) are not yet implemented.
- **GraphExplorer simplified to a frontend concern**: Instead of a separate backend concept, the “graph explorer” is implemented as a frontend experience over the `MultiSourceNetwork` concept, simplifying the conceptual model. `GraphExplorer` concept is now removed and absorbed into `MultiSourceNetwork` concept.
- **Known gaps and deferred features**: Several syncs, advanced filters, privacy controls, and multi-platform imports are documented but not yet built; see the Beta functional design and development plan for full details.

### Updated Functional Design
- [Functional Design — Beta](functional-design-beta.md)

### Updated Development Plan
- [Development Plan — Beta](development-plan-beta.md)

### LinkedIn Import Instruction
You can download the sample LinkedIn CSV file below to test importing. You can also try with your own LinkedIn connection.csv file. However, you will have to request ahead of time (about 24 hrs) due to how LinkedIn works for sending out data. If your LinkedIn connection.csv is large, it can take a few minutes to render the graph.

- [Here's how to export your LinkedIn connection csv](https://www.linkedin.com/help/linkedin/answer/a1339364/downloading-your-account-data)

- [Sample LinkedIn CSV File to Download](sample_linkedin_connections.csv)

### Features Still in Development for Beta
- [Features still in development — Beta](Beta-In-Development.md)
