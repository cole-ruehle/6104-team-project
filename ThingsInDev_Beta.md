# Things In Development (Beta)

## Active Development Areas

### Network Search Tab
The Network Search tab is still under active development. This feature is planned for future updates to enable cross-platform identity matching. For example, identifying that "Bob W." (added via LinkedIn import) is the same person as "Bob Williams" (added via Handshake or manual entry).

### UI/UX Polish
General UI/UX polishing across the website is still in progress. However, the graph visualization UI should be functional and ready for use.

**Graph Visualization Troubleshooting:**
- If the graph is not displaying or appears broken, try clicking the "Create Network" button to refresh the visualization.
- Note: The "Refresh View" button currently does not work as expected.

### User Search Functionality
The ability to search for other users within the application system has been removed. The application now uses LLM-powered semantic search to find and explore connections within your network instead.

## Known Issues

### Data Persistence on Account Switch
Switching between user accounts in the same browser tab does not automatically clear the frontend data. Users may see the previous account's data until a page refresh is performed.

### LinkedIn Export Limitations
The application is subject to limitations based on the data available from LinkedIn's export feature. Not all profile information may be available depending on what LinkedIn includes in their export files.
