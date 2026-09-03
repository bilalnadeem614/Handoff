"use client";

// Polyfills document.modelContext / navigator.modelContext in browsers
// that don't natively support WebMCP yet (i.e. anything other than
// Chrome 149+ with the WebMCP flag, or the ChatGPT in-app browser).
// Must be imported before any registerTool()/useWebMCP() calls run.
import "@mcp-b/global";

import KanbanBoard from "../components/KanbanBoard";

export default function Home() {
  return (
    <main className="app-main">
      <header className="app-header">
        <h1>Handoff</h1>
        <p>A Kanban board your AI agent can actually use — via WebMCP.</p>
      </header>
      <KanbanBoard />
    </main>
  );
}
