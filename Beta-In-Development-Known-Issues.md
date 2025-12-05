# Features In Development (Beta Checkpoint)

## Active Development Areas

### Network Search Tab
The Network Search tab is still under active development. This feature is planned for future updates to enable cross-platform identity matching. For example, identifying that "Bob W." (added via LinkedIn import) is the same person as "Bob Williams" (added via Handshake or manual entry).

### UI/UX Polish
General UI/UX polishing across the website is still in progress. However, the graph visualization UI should be functional and ready for use.

### User Search Functionality
The ability to search for other users within the application system has been removed. The application now uses LLM-powered semantic search to find and explore connections within your network instead.

## Known Issues

### Semantic Search Unintuitive Location
Semantic search bar is currently located in "Public Profile" tab which may be unintuitive. It will be moved either into it's own tab or in "Network Search" tab.

### Data Persistence on Account Switch
Switching between user accounts in the same browser tab does not automatically clear the frontend data. Users may see the previous account's data until a page refresh is performed.

### LinkedIn Export Limitations
The application is subject to limitations based on the data available from LinkedIn's export feature. Not all profile information may be available depending on what LinkedIn includes in their export files.

### Graph Visualization Missing Position Field
CSV files have "position" fields for every connection, but that is currently not populating correctly in the graph visualization.

### Graph Visualization Sometimes Not Appearing
If the graph is not displaying or appears broken, try clicking the "Create Network" button to refresh the visualization. And note that the "Refresh View" button currently does not work as expected.

### Update Profile Button Broken
The "Update Profile" button in "Public Profiles" tab broke during our merging process.

### "View My Network" Button Not Set Up
The "View My Network" for semantic search results is not wired up yet. When it does get wired up, it will show a network of the search results.
