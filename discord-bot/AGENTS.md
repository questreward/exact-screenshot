# Discord bot architecture
- Keep the Node Discord Gateway worker outside the TanStack application because welcome events require a persistent connection.
- Runtime reads only named discord SQL views with the dedicated login, never player RPCs, admin credentials or gameplay tables; proposed SQL must pass isolated permission tests before approval and deployment.
- Keep announcement authorization on the verified Discord user ID and configured guild; interest roles have no privileged permissions.
- Serialize all journal writes and persist pending before external sends; uncertain sends require review, not automatic resend, because Discord and local storage are not one transaction.
- Read recorded elections, news and TV only; never settle game deadlines, generate content or infer outcomes. Wealth consent inside the game does not implicitly authorize Discord publication.
- Store Discord/VPS credentials only in the root-owned private server environment; do not commit tokens or copy website secrets into the bot.