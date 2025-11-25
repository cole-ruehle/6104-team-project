## Logistics
- Date: 11/20/2025
- Time: 4:30-5:30pm
- Location: Zoom

## Agenda
- Clarify each member's assigned work and questions/issues
- Go over the questions other students had about our pitch
- Set up next week's TA check-in (likely Monday or Tuesday over Zoom)

## Progress Report
Last week and this past week, we met up and decided on a new project idea, submitted our problem framing, and created our pitch. As we worked on the functional design, we fleshed out the application details, such as the concepts, syncs, color palette, typography, and development plan.

## Design Changes
Instead of our initial digital meal ordering system, we are now working on a tool where users can import and query their network. Over the week we have also adjusted our features from problem framing into more specific concepts and syncs.

Below is the responsibilites each team members as taken on for the Alpha checkpoint:

| Phase                | Backend Lead    | Frontend Lead | Focused Concept(s)                 |
|----------------------|----------------|---------------|-------------------------------------|
| Alpha 1 (Network)    | Ivy            | Jing          | PublicProfile, MultiSourceNetwork   |
| Alpha 2 (Search)     | Jenna          | Jing          | SemanticSearch                      |
| Alpha 3 (Importing)  | Cole Ruehle    | Jing          | MultiSourceNetwork (import flows)   |

## Issues
- Certain application details are still ambiguous (e.g., notifying non-users their presence on the application).
- Regular team check-ins: haven't decided on a day and time for our weekly check-ins.

## Plans & Decisions
- For semantic-search:
  - Ideally use: https://github.com/neuml/txtai
  - Fallback for above: Call to Google Gemini
  - Ultimate fallback: Something deterministic
- Datas structure for import data (connections):
  - On MongoDB: {user, …, [connected users]}
- Create a Context Dependency Diagram:
  - Take everything from all states
  - Every action -> MongoDB collection
  - Make sure each collection has certain fields
  - Draw line to show dependencies
- Need to do more search on LinkedIn integration with issue of users changing their custom LinkedIn link.
- Don't need to have watchdogs to rescrape data. If a user adds a new connection, they would have to manually add it on the platform. Another idea is to have some sync functionality that a user can update and rescrape their network. *Completely resolving this issue is not required if it's too difficult but need to at least address the issue in word for final submission.*
- For Alpha submission:
  - Address the major questions students had about our pitch in design document.
  - List the concepts that are build out to be graded. 
  - At submission time, adjust the concept specs at the time match the code even if its not complete.
  - Make sure incomplete concepts/functionality have fallback errors.
