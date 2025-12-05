# Final Report

## Design Summary

### Ethics of importing
Our original plan was to use a system similar to those commercially available online, which scrape profile information on a per-profile basis (e.g., profile_id → information). However, despite these sources existing, many are vague about how they accomplish this. Upon reviewing the LinkedIn API, we discovered that a change was made around six years ago to limit the amount of information accessible through standard means. This is because LinkedIn decided to monetize access to this data, making it available only to their corporate partners—requiring negotiation of a hefty payment package. Despite these factors, it is clearly still possible to get information from LinkedIn, and since LinkedIn still permits it (for a price), the use of that data is not inherently unethical. However, after this research, it became clear that knowingly subverting the explicit changes LinkedIn has made would be unethical.

The second option I considered was using a method similar to "Sign in with LinkedIn." If you have ever signed in with Google, you may have been prompted with a question asking to share your email or contacts with the app. My hope was that, since this is a common paradigm centered around the user's own information, this would be possible with LinkedIn. However, from developer testimonials, it appears that the sign in with LinkedIn feature is primarily designed for authentication, not for streamlined integration or data import. Therefore, the information we could access would be limited.

This put me in a difficult position to design an importing system that would both meet our ethical standards and comply with the restrictions set by LinkedIn. While continuing to scrape could be possible (and many others do, even scraping and selling the data of accounts they do not own), that approach seemed inappropriate.

In searching for apps that provide value while allowing import of data they are not directly connected to, I found an example: https://www.swipestats.io. This service allows users of dating apps like Tinder to visualize their swiping and interaction history. Dating app companies do not like this use case, because it is often used by people to comment on the futility of dating apps—creating visualizations about the ratio of time spent using the app to actual dates or relationships. As a result, the app cannot integrate directly with Tinder through an API or similar mechanism. The solution they developed is to allow users to import their own data via a file upload. The app provides instructions on how to request your data from Tinder and which file to upload to quickly import everything. In fact, it does not offer any other way to add data.

Despite these limitations, the app is undoubtedly popular. You can see hundreds of people posting its visualizations in forums like https://www.reddit.com/r/Tinder/. This inspired the implementation of our import concept: we allow users to request their LinkedIn data (with instructions on how to do so), then import that data into our system—along with supporting other manual additions and data from different sources (since an LLM will review any file passed in and attempt to match it dynamically to our internal concept).

## Reflections

### Cole