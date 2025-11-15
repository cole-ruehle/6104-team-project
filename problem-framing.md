# Problem Framing

## Domain

Our domain is social media specifically in the networking sense. It will cross into other corporate or professional tools like application listing platforms and portfolio sharing resources as it tries to serve the user and employer side of those services.

## Problem

Social media apps for networking don’t help with the problem of finding who I know. You have to remember or search through your list in hopes of finding the person you want. When it comes to hiring out, trying to learn, you are looking for someone with specific knowledge, skills, and experience. Our app will turn your social network into a tool for connection, hiring, and knowledge.

## Evidence

1. **Personal Testimonial:** I’ve hired multiple engineers at my company, and the biggest challenge is quickly finding strong candidates. The best hires almost always come through introductions from my network because trusted connections act as a filter and respond faster. My boss frequently mentions that he knows he is connected to many great engineers but has no efficient way to find them.
2. [**The Shortest Path to Better Hires: Best Practices for Employee Referral Programs:**](https://www.oracle.com/us/shortest-path-to-better-hires-1898145.pdf) States that better employees can be found through referred candidates (i.e. those in your network). “The people closest to your best employees are also likely to be good employees.”
3. [**Why Posting Jobs Is Not Enough to Get Good Candidates:**](https://thinkingahead.com/resources/hiring-advice/why-posting-jobs-is-not-enough-to-get-good-candidates/) Posting job opportunities online can often be inefficient. As the article states, an average job posting gets a few hundred applications, which can be overwhelming for the recruiters. Job postings also do not attract all talents, and the article recommends that the recruiter actively reach out to potential employees rather than post passively.
4. [**The Hidden Cost of Hiring: Why Relying on Job Applications for Specialized Roles is Costing You More Than You Think:**](https://www.opsvs.com/2025/03/06/the-hidden-cost-of-hiring-why-relying-on-job-applications-for-specialized-roles-is-costing-you-more-than-you-think) Mentions that searching for candidates the traditional way through online posting lead to higher turnover rates and less productivity. Instead, being able to find an employee within one's network is more cost effective and efficient.


## Comparables

1. **[LinkedIn](https://linkedin.com):**
    - Similar but different due to indexing it is also a content sharing mechanism rather than focusing on doing operations on the network data.
    - Limitations: Search feature is not flexible when it comes to search higher degree connections.
2. **[Instagram](https://www.instagram.com/):**
    - Also a network where you can see who follows who and who tags who allowing it to branch.
    - Limitations: Does not provide a lot of professional information about someone and does not allow ease of search for higher degree connections.
3. **Portfolio websites:**
    - A way an engineer can share their work in a way that it is hopefully searchable and indicative of their ability to professional employers.
    - Limitations: Often does not provide a wide enough network to be very helpful.
4. **[Indeed](https://www.indeed.com/):**
    - A method for generating leads to hire and connect. It uses a very different strategy though of blasting them out on a board and serving them to random individuals who have more agency rather than giving their information to employers who selectively reach out.
    - Limitations: Does not support searching for higher degree connections.

## Features

1. **Account Creation and Management**
   - Users can create and manage their accounts.
   - Users control what information is visible, private, or excluded from their profile.

2. **Importing Connections from External Platforms**
   - Users can connect external platforms such as LinkedIn, Instagram, or Handshake.
   - Public information about their connections is imported into a unified in-app network.

3. **LLM-Powered Connection Schema**
   - The system uses an LLM to automatically interpret imported connections' information.
   - Skills, roles, interests, and relevant attributes are inferred from public data.

4. **Network Querying for Relevant Connections**
   - Users can query their network for relevant connections.
   - The LLM semantically searches across the user’s entire imported network to find these relevant people.

5. **Filtering Query Results**
   - After querying, users can apply filters such as:
     - Platform origin (LinkedIn, Instagram, etc.)
     - Education, company, location, or mutual connections
     - Degree of separation
     - Etc.

6. **Interactive Network Exploration**
   - Users can visually explore their entire multi-platform network or any post-query subset through an interactive graph.
   - Connections are clustered and color-coded using LLM inference.
   - Users can see how any person is connected to them through intermediaries.


## Ethical Analysis

1. **Values (Chosen Desired Values: Privacy and Consent):**
   - An important question is consent to be on the site. What permissions and consent do we need from someone to be able to use their information in our application?
   - We decided that importing only public profiles and that public information should be shared. We are aligning with the goal of those platforms and only sharing public employment information so it should be fair. Secondly, we will not disambiguate using personal info like phone numbers. Finally, we will have a set of push notifications saying something like “X manually added you to their network. Would you like to join the platform or dispute that you know this person, allowing someone to intervene.

2. **Time (Reappropriation)**
   - Although the app is mostly aiming to help recruiters find candidates faster, users might use the search tool in other ways. For example, they can use the app to find peers with similar interests or classmates who have taken a class they wish to learn more about.
   - We can expand the app to not only store professional data from LinkedIn. Rather, we can also have the users input their own data if they wish. This would allow others to find them more easily in the network.

3. **Time (Choosing Not to Use)**
   - If some users choose not to use the app or choose not to consent to having their data on the app (keep everything private), then we might have some holes in the network.
   - We are going to limit ourselves to only public information. A few holes in the network is unavoidable, but the network will still be pretty complete. Our search feature would just have to be more robust and work around these missing pieces of information.

4. **Values (Value Tensions)**
   - A user might want to keep some of their information private, but because they want to be visible to recruiters on the app, they feel pressured to have more of their information visible and public on their profile.
   - We can introduce a visibility system, where some information is only visible to certain users (for instance, limiting it to only be visible to those in your direct network).

5. **Stakeholders (Indirect Stakeholders)**
   - People who do not use the app might find themselves appearing in searches because they were in someone else’s network. This might create concerns about privacy.
   - We will only be using public data, so if someone prefers to remain private, their information will not show up in our application.
