"use client";

import { useEffect } from "react";

/**
 * Registers every agent-facing tool for the Kanban board.
 * Each tool reuses the exact same functions the human UI calls
 * (createTask, moveTask, updateTask, deleteTask, listTasks) — the
 * agent and the human are operating on one shared source of truth.
 *
 * Registers directly against the native `document.modelContext.registerTool`
 * API (per the WebMCP polyfill from @mcp-b/global, imported in the app
 * shell) instead of the `useWebMCP` hook, whose `handler` callback isn't
 * wired to the native API's required `execute` property.
 */
export function useWebMCPTools({
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  listTasks,
  prioritizeTasks,
}) {
  useEffect(() => {
    if (!document.modelContext) return;

    const controller = new AbortController();
    const { signal } = controller;

    document.modelContext.registerTool(
      {
        name: "create_task",
        description:
          "Create a new task on the Kanban board. Use this when the user (via their agent) wants to add a new to-do item.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short title of the task" },
            description: {
              type: "string",
              description: "Optional longer description",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Task priority, defaults to medium",
            },
            status: {
              type: "string",
              enum: ["todo", "in_progress", "done"],
              description: "Initial column, defaults to todo",
            },
          },
          required: ["title"],
        },
        execute: async ({ title, description, priority, status }) => {
          const task = await createTask({
            title,
            description,
            priority,
            status,
            source: "agent",
          });
          return {
            content: [
              { type: "text", text: `Created task "${task.title}" (id: ${task.id}).` },
            ],
          };
        },
      },
      { signal }
    );

    document.modelContext.registerTool(
      {
        name: "list_tasks",
        description:
          "List tasks on the board, optionally filtered by status (todo, in_progress, done) or priority (low, medium, high).",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["todo", "in_progress", "done"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: [],
        },
        execute: async ({ status, priority }) => {
          const results = listTasks({ status, priority });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  results.map((t) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                  })),
                  null,
                  2
                ),
              },
            ],
          };
        },
      },
      { signal }
    );

    document.modelContext.registerTool(
      {
        name: "move_task",
        description:
          "Move a task to a different column: todo, in_progress, or done. Requires the task id (use list_tasks to find it).",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The task's id" },
            status: { type: "string", enum: ["todo", "in_progress", "done"] },
          },
          required: ["id", "status"],
        },
        execute: async ({ id, status }) => {
          const task = await moveTask(id, status, "agent");
          return {
            content: [{ type: "text", text: `Moved "${task.title}" to ${status}.` }],
          };
        },
      },
      { signal }
    );

    document.modelContext.registerTool(
      {
        name: "update_task",
        description:
          "Edit a task's title, description, or priority. Requires the task id (use list_tasks to find it).",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["id"],
        },
        execute: async ({ id, ...patch }) => {
          const task = await updateTask(id, { ...patch, source: "agent" });
          return {
            content: [{ type: "text", text: `Updated "${task.title}".` }],
          };
        },
      },
      { signal }
    );

    document.modelContext.registerTool(
      {
        name: "delete_task",
        description: "Delete a task from the board. Requires the task id.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        execute: async ({ id }) => {
          await deleteTask(id);
          return {
            content: [{ type: "text", text: `Deleted task ${id}.` }],
          };
        },
      },
      { signal }
    );

    document.modelContext.registerTool(
      {
        name: "prioritize_tasks",
        description:
          "Apply a batch of priority (and optional reorder) changes decided by the calling agent. " +
          "The agent has already reasoned about priority using list_tasks — this tool just applies " +
          "the changes atomically, it does not decide priority itself.",
        inputSchema: {
          type: "object",
          properties: {
            updates: {
              type: "array",
              description: "Batch of priority updates to apply",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "The task's id" },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                  position: {
                    type: "number",
                    description: "Optional new position, for reordering within a column",
                  },
                },
                required: ["id", "priority"],
              },
            },
          },
          required: ["updates"],
        },
        execute: async ({ updates }) => {
          await prioritizeTasks(updates);
          return {
            content: [
              { type: "text", text: `Reprioritized ${updates.length} task(s).` },
            ],
          };
        },
      },
      { signal }
    );

    document.modelContext.registerTool(
      {
        name: "summarize_board",
        description:
          "Get a natural-language summary of the current state of the board: counts by column and priority.",
        inputSchema: { type: "object", properties: {}, required: [] },
        execute: async () => {
          const all = listTasks();
          const byStatus = (status) => all.filter((t) => t.status === status).length;
          const highPriorityOpen = all.filter(
            (t) => t.priority === "high" && t.status !== "done"
          ).length;
          const summary =
            `${all.length} tasks total — ` +
            `${byStatus("todo")} to do, ` +
            `${byStatus("in_progress")} in progress, ` +
            `${byStatus("done")} done. ` +
            `${highPriorityOpen} high-priority task(s) still open.`;
          return { content: [{ type: "text", text: summary }] };
        },
      },
      { signal }
    );

    return () => {
      controller.abort();
    };
  }, [createTask, updateTask, moveTask, deleteTask, listTasks, prioritizeTasks]);
}
