import "./globals.css";

export const metadata = {
  title: "Handoff — WebMCP Kanban",
  description:
    "A collaborative Kanban board where a human and their AI agent share task management via WebMCP.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
