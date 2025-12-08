# Data Population Plan

To make the app feel realistic, we prepopulated it with a large set of LinkedIn-style profiles taken from our team member Cole’s real network. This included diverse job titles, companies, locations, and industries so users could meaningfully test search, visualization, and connections. In one of our tasks below, we also prompted the tester to add a second dataset so the tester could experience the full import pipeline.


<br>

# Task List
| Task Title                            | User Instruction                                                                                          | Rationale                                                                                                                                                                                      |
|----------------------------------------|----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Log In                                | Log into your account using your provided credentials.                                                    | Tests the clarity and usability of the login process for real users, highlighting potential confusion or friction that might be overlooked by developers during walkthroughs.                  |
| Update Profile Name & Photo            | Change your account display name and upload a profile photo.                                              | Validates the discoverability and ease of use of account settings/personalization, ensuring users can find how to change profile details without hints.                                        |
| Manually Add a Network Node            | Add a new connection manually to your network by entering specific details.                               | Checks if users can find and complete the manual node addition workflow, surfacing interface pain points that may not be obvious when executing steps as a developer.                         |
| Import LinkedIn Connections            | Import your additional LinkedIn connections from the provided CSV or JSON file.                           | Tests import workflow and UI clarity, ensuring that users can independently find and trigger the import process, and that file-handling instructions are understandable and error-tolerant.    |
| Capture Network Screenshot             | Take a screenshot of your current network visualization.                                                  | Evaluates whether users can locate and use network visualization tools, and reveals if needed controls (like screenshot/export) are visible and usable in a real-user context.                |
| Search for a Specific Person           | Use the search functionality to find a specific person in your network.                                   | Assesses the intuitiveness of search for direct queries and whether it matches user expectations for search results and interaction patterns.                                                  |
| Search by Job Title                    | Search your network for people who are software engineers.                                                | Determines if the semantic search accommodates non-name-based queries, and if users naturally phrase and execute such searches, revealing gaps in UX or results relevance.                    |
| Search by Company                      | Search your network for someone who works at Google.                                                      | Shows whether the system supports organization-based search, helping uncover edge cases in company/entity disambiguation and surfacing issues with search accuracy or usability.               |

---
<br>

# Case Notes


[User 1 test video (sped-up): https://youtu.be/PFMkJETPwyY]

## User 1 - Feedback, Notes

### Live notes summarized

- First, before even logging in: “What if I forget my password?” — didn’t have any option for that. (We don’t have password reset or recovery at all.)
- Logs in with username, no issue there.
- Gets to profile creation. Just stares at the form: totally unclear what any of the fields mean. “Need to enter a link” – user thinks maybe it’s about a company? (“Headline” is especially confusing. User literally asks “what does that mean?” Shrugs, ends up entering something personal (website), treats “headline” like a bio.)
- Clicking around to try to find out what things are: Hits the account icon, not the settings icon (actually finds better explanations there about profile info, which maybe means the navigation is weird).
- Upload + Save: Frustrating, needs to be one button (“Why is upload and save separate?”). Also, “saving takes forever,” and when it’s done things don’t update reliably in the profile.
- Trying to find/search networks: It defaults to network search, which throws user off — can’t tell where to go; search stuff is hidden. “Multi source network” tab — they say this is a terrible name, can’t find it, literally tries typing it into the network search (didn’t work). The filters are also not helpful (seems user thought filters let you add stuff).
- Goes to “multi source network” when prompted, pokes around. Ends up adding a root, not a connection — sort of stuck, doesn’t know what to do. “Add connection” is not discoverable enough.
- The whole “manage nodes/edges” is way too technical. User: “I just want to add a connection, not know how the database works. Just like LinkedIn!” Tags make no sense — “what are these? why do I fill this out?” Avatar URL is totally internal, no one knows what to do with a URL (should just upload a photo). Too much detail required, including “enter a JSON array” (!).
- Not clear you have to add an edge after a node. (No one will get this—should never have to write JSON or strings or anything nerdy as a user.)
- When they actually get to import, immediate success: Goes to the import tab and uploads with no problem. This workflow “should be everywhere.” Suggests “add a how-to on pulling LinkedIn links.”
- Goes back to multi-source network (they said only because they saw something “networky” before). Tries clicking on nodes (wants to find out who people are), can’t really tell. “Can I see different degrees? Maybe if I import others it’ll show degree of separation?” (Seems they expect more interaction/visual differentiation.)
- Search: tries to search in network, uses “network search” tab. “Public profiles” is a terrible name. Network search is way too slow; seems like nothing is happening. (Tries searching multiple times in the same bar.)
- Tries searching for “teacher” in network search, never tries public profiles (naming/discoverability issues). “I want to search anything anywhere.” Also noticed: tries adding “Google” and “McDonald’s” as root nodes. “Why do you even have to add roots? Feels like a lot just ends up in abyss.”
- UX meta-notes: “Should have a footer since you have no idea what’s going on or who made this.”
- “Why isn’t everything just one tab with logical groupings? How does filtering work?”
- One more: “If you have 500 dots you will not find anyone. Visualization is not useful unless it helps you navigate.”

### Improvement Opportunities

The biggest thing is that the front end design is poor. It should be simpler with buttons that prompt quick and clear user flows. "Add connection" pops up and takes a simple path to start and end with completeion. Same thing with linked in, accoutn creation and everywhere. A major theme with front end is to think about how the user will use the product and focus on that. NO decisions should be made on back end concepts or technical implemetaiton waht matters is the user flow not what the backend is expecting or what concept it is going to. The final thing is that the design colors were offputting and it made them less confident to navigate than websites and services that seemingly push you to exactly where you need to go.

### Changes List
| Flaw/Area                        | Explanation                                                                                                                           | User Test Evidence (notes on where/why this is needed)                                                                                                                                                                                      | Potential Solution(s)                                                                                                                                       |
|----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Overly Technical Design          | The app uses too much backend/developer jargon (like "node," "edge," "JSON array," "avatar URL"), and many UI labels are unclear or misaligned with user intent.           | User was confused by labels like "Add node," "manage nodes/edges," and "avatar URL"; didn't understand concepts or required data, and asked "what does that mean?" for "headline" field; expected LinkedIn-like flows.                 | **UI Overhaul, Design Streamlining**: Replace technical terms with user-friendly language, use familiar social networking metaphors, and clarify all labels.  |
| Poor User Flow & Navigation      | Navigation is fragmented and non-intuitive, with multiple tabs and no clear, guided process for common tasks; actions often require understanding backend structures.        | User struggled to find the right tab ("multi source network" hard to locate, typed tab name in search bar), expected simpler actions like "add connection," and found it unclear how to proceed (added root by accident, etc.).        | **Design Streamlining, UI Overhaul**: Simplify navigation, make main actions (add connection, import data, search) central and obvious; provide guidance.    |
| Lack of Responsiveness           | The interface is slow to update, save, and confirm user actions, leading to frustration and loss of trust in whether processes succeeded.                                    | User complained "saving takes forever," profile didn't update reliably or quickly, and network search gave little/no feedback ("seems like it is doing nothing"), making the app feel unresponsive and unreliable.                      | **Backend Optimization, Confirmation Messages**: Improve performance where possible and provide loading/progress indicators and after-action feedback.         |
| Insufficient Confirmation/Feedback| Actions don't consistently provide feedback or confirmation, so users often don't know if what they did worked—except for file import, which was clear and successful.            | Only importing a file gave a clear success state; all other actions ("save," add/edit flows) left the user unsure if anything happened—user asked for confirmation messages or visible response after each action.                       | **Confirmation Messages, UI Overhaul**: Ensure every major action has visible, timely success and error notifications, similar to the import workflow.        |


---
<br>

## User 2 – Feedback, Notes

### Live Notes Summarized

- The user complimented the color scheme and said it's soothing to the eye.

- Before logging in, the user immediately asked what would happen if they forgot their password. There is no password or username recovery function.
- After logging in, the user reacted strongly to the layout and said the page felt very cluttered. They said “WHAT IS ALL THIS??” and also questioned why the application name was missing from the page.

- The user could not find any way to change their profile display name. They were able to upload a new profile picture successfully.
- They were confused about why there is a Public Profiles page and why there is a broken Update Profile button even though there is already a settings page where the profile picture can be changed.

- When attempting to manually add a connection, the user became very confused. The panel was hard to read and use. They said the following:
  - “This is too much.”
  - “You’re expecting me to have this person’s resume next to me.”
  - “Why do I need to add in their summary.”
  - The language is too technical.
  - Having dropdowns for names of connections is nice and helpful.
- They were surprised that the edge adding fields take in names and didn't understand what to fill in for "Source" and "Weight".
- The circular layout of the network visualization was confusing and hard to read.
- The user questioned why adding an edge is not included in the process of adding a node.
- They also found the network graph difficult to play with, but they enjoyed how nodes can be moved around very smoothly.

- The user easily navigated to the correct page to import connections and uploaded the file without issues. They suggested adding a progress percentage bar since the upload can take a while.

- When searching for a specific person, the user became confused again.
  - They did not understand why semantic search was located in the Public Profiles tab.
  - They asked “So there’s two different searches?” because there's a keyword-like search in Network Search tab and a semantic search in Public Profiles tab.
  - They questioned why the two search bars were in different places.
  - They also questioned what the semantic score means.

- Searching for software engineers was successful, but the user questioned why interns ranked above actual software engineers.

- Searching by company was completed with no confusion.

### Post-Test Debrief Notes

- The user felt the app was not beginner friendly.
- They suggested that many things could be combined into one instead of being spread out across multiple tabs.
- They expected the network visualization to be emphasized since it seems like the main feature. They questioned why it appears low on the page instead of being the first thing shown after logging in.
- They found the three column layout for working with the network to be confusing and taking up too much space.
- Required fields should be more clearly emphasized, for example in red.
- Some node panels in the visualization were cut off and not readable.
- The user said there should be limits for zooming in and out, since the current zoom behavior is messy.
- The 100% zoom state does not look like 100 percent to them. They suggested using whatever the refresh view sets the graph to as the true 100 percent.
- The main tab layout did not feel intuitive, and they felt the entire app could be simplified into one or two tabs such as Network and Search.
- They also wanted profile data beyond the picture to be editable.

### User 2 – Report

This user test made it really clear where things feel intuitive in the app and where people just get stuck. Even before logging in, the user asked what would happen if they forgot their password, which immediately showed we’re missing some really basic account features. Once they got into the app, their first reaction was basically confusion. The layout felt overwhelming to them, and without the app name anywhere, they weren’t even sure what page they were on or what they were supposed to do first.

The biggest pain point was definitely the manual “add connection” flow. The user expected something simple, like adding a connection on LinkedIn, and instead ran into a long form with a lot of technical language. Their comments about needing someone’s resume really highlighted how mismatched what we ask the user to fill out with what someone would realistically know and want to fill out. They were also confused about why adding an edge wasn’t just part of adding a node. They did appreciate the dropdown for selecting names, so there were small parts of the flow that made sense to them, but overall they were pretty overwhelmed.

Search was a similar situation. The tasks themselves were completed, but the user didn’t understand why there were two forms of searching and why they were located in different pages. They also weren’t sure what the semantic score meant and questioned certain semantic responses, such as why interns were ranking above actual full-time engineers when they queried "software engineers". So even though search worked, the reasoning behind it wasn’t communicated well and the information wasn't delivered well.

There were some positive moments though. Importing the LinkedIn file went smoothly, and they had no trouble finding the right page or finishing all the tasks. They also liked how smoothly the nodes moved around in the graph visualization, even if the circular layout itself felt confusing and hard to read.

Overall, this test showed a clear divide between the parts of the app that are simple and the parts that feel overly complex. Whenever a flow was direct and clearly labeled, the user moved through it with no issues. But the moment the interface required them to understand technical terms or jump between different tabs, they got confused or stuck. It highlighted exactly which areas need simplification so the core ideas of the app can come through more clearly.


### Improvement Opportunities

| Flaw/Area | Explanation (Why it occurs) | How to Address It | User Test Evidence |
|-----------|-----------------------------|--------------------|--------------------|
| Undiscoverable Profile Editing | Profile editing is scattered across multiple locations with inconsistent or unclear labels. The broken Update Profile button and the existence of Public Profiles alongside Settings creates conflicting pathways. | Consolidate all profile editing into a single, clearly named Settings page. Remove or repair duplicate buttons and eliminate unnecessary pages like Public Profiles if they overlap with existing functionality. | User never found where to change their display name, noticed a broken Update Profile button, and questioned why Public Profiles was separate from Settings. |
| Overly Technical Manual Connection Workflow | The manual node and edge creation panels expose backend concepts directly to users. Field names and required inputs do not match what users typically know about their connections. | Replace technical field names with user-friendly labels. Hide backend values or auto-generate them. Combine node and edge creation into one guided flow that matches how users expect to “add a connection.” | User said “This is too much,” questioned why many fields were needed, and did not understand what many fields are asking for such as “Source" or “Weight.” |
| Fragmented Search Experience | Search functionality is split across multiple tabs, creating a disconnect between the keyword-like search and semantic search located on different pages. This stems from features being built separately instead of as a unified search system. The user also questioned the details of search results, such as the semantic score. | Consolidate all search into one unified search page. Visually separate keyword vs semantic search modes within the same interface. Provide clear explanations for semantic scoring and ranking logic. | User asked “So there’s two different searches?” They questioned semantic search being in Public Profiles and did not understand where the semantic score came from. |
| Poor Visualization Usability | The graph layout lacks clear structure, constraints, and viewport handling. Node detail panels can be cut off, zooming behaves unpredictably, and the visualization is not emphasized (and rather hidden under a lot of panels) despite being the main feature of the app. This occurs because the visualization was added without a layout strategy or a clear place in the information hierarchy. | Add max/min zoom limits, ensure node detail panels reposition within the viewport, move the visualization to a more prominent location on the page, and switch to a more readable default layout (ex: hierarchical or force-directed). | User said the circular layout was confusing, node panels were sometimes cut off, zooming felt messy and unintuitive, and they questioned why the graph is placed so low on the page if it is supposed to be the main feature. |
| Overwhelming Initial Interface | The landing page contains too much information with no visual hierarchy or guidance. Without the app name or a clear starting point, new users feel lost immediately. | Simplify the landing page and introduce a clear top-level structure. Add the application name, highlight the primary action (network visualization), and reduce visual clutter. | Upon login, the user said “WHAT IS ALL THIS??” and questioned why the application name was missing. |


---
<br>

## Similarities Between User 1 and User 2

Across both user studies, there were several strong points of overlap:

- Both users immediately felt overwhelmed by the interface after logging in. Each commented on clutter and confusion right away.
- Both were unable to find or understand how to edit basic profile data such as their display name.
- Both found the manual connection creation process extremely confusing. They questioned the number of required fields, did not understand the terminology, and felt the process expected far too much information.
- Both were confused by fragmented navigation. They had trouble finding the correct tabs, and both felt that there were too many sections that could be combined.
- Both struggled with graph usability, noting that the layout was confusing, difficult to read, and not intuitive to interact with.
- Both questioned why search features were split into different tabs and why semantic search was separated from the keyword-like search.

Overall, the two user tests independently revealed the same core issues in navigation, terminology, information density, graph usability, and the separation of search features. These recurring patterns indicate that the problems are systemic rather than isolated to individual users.
