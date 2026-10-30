# Original Sites server implementation

These files preserve the original authenticated research desk and D1 API imported from ChatGPT Sites. They are excluded from the Vercel TypeScript build. Their imports use their original project-relative locations and are reference source, not a second runnable application in this directory.

The imported source Site revision is `23cc834317b9251d21fe8872f5a7f706fac32e34`; its repository history remains in ChatGPT Sites. The current Sites deployment continues to own authentication, access control and saved briefs. The Vercel frontend passes only validated catalogue selections in a URL fragment; it does not proxy identity or migrate private records.
