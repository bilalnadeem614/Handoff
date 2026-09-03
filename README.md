# Handoff

A collaborative Kanban board where a human and their AI agent share task
management. The agent manipulates the board through **WebMCP** tools
(`document.modelContext.registerTool`) while the human works visually with
drag-and-drop — both act on the same shared state in real time.

Built for [The WebMCP Challenge](https://webmcp.devpost.com).

## Why WebMCP

Without WebMCP, an agent that wants to manage your tasks either needs a
bespoke API integration or has to click around the page like a bot. With
WebMCP, this app exposes its task actions directly as tools an agent can
discover and call — `create_task`, `move_task`, `update_task`,
`delete_task`, `list_tasks`, `summarize_board` — so "reorganize my sprint by
priority" just works, live, in the same UI a human is looking at.

## Stack

- **Next.js / React** — frontend, hosted on Vercel
- **Supabase** (Postgres + Realtime) — shared task storage, free tier
- **@mcp-b/global** + **@mcp-b/react-webmcp** — WebMCP polyfill + React
  hook, so tools register whether or not the browser natively supports
  `document.modelContext` yet
- **@hello-pangea/dnd** — drag-and-drop for the human side of the UI
- No backend server — the browser talks to Supabase directly

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a [Supabase](https://supabase.com) project (free tier).
3. In the Supabase SQL editor, run `supabase/schema.sql` to create the
   `tasks` table, enable Realtime, and set up RLS policies.
4. Copy the env template and fill in your project's URL/anon key
   (Supabase dashboard → Settings → API):
   ```bash
   cp .env.example .env.local
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000

## Testing the WebMCP tools

WebMCP is currently only natively supported in:
- the **ChatGPT desktop app's in-app browser**, or
- **Google Chrome 149+** with `chrome://flags/#enable-webmcp-testing`
  enabled

Open the app in one of those environments, then ask your agent things like:
- "Add a task to buy milk, high priority"
- "Move the 'buy milk' task to in progress"
- "Summarize the board"

Tasks the agent creates or moves will show an **"agent"** badge and a brief
highlight pulse, so it's visually clear which actions came from the agent
vs. the human.

## Deployment

Deploy to [Vercel](https://vercel.com):
```bash
vercel
```
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
environment variables in the Vercel project settings (same values as
`.env.local`).

## License

MIT — see [LICENSE](./LICENSE).
