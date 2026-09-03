"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { z } from "zod";

/**
 * Registers every agent-facing tool for the Kanban board.
 * Each tool reuses the exact same functions the human UI calls
 * (createTask, moveTask, updateTask, deleteTask, listTasks) — the
 * agent and the human are operating on one shared source of truth.
 *
 * @mcp-b/react-webmcp's useWebMCP hook registers the tool against
 * document.modelContext on mount and unregisters it on unmount, so
 * this hook just needs to be called once near the top of the app
 * (see components/KanbanBoard.jsx).
 */
export function useWebMCPTools({
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  listTasks,
  prioritizeTasks,
}) {
  useWebMCP({
    name: "create_task",
    description:
      "Create a new task on the Kanban board. Use this when the user (via their agent) wants to add a new to-do item.",
    schema: z.object({
      title: z.string().describe("Short title of the task"),
      description: z.string().optional().describe("Optional longer description"),
      priority: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("Task priority, defaults to medium"),
      status: z
        .enum(["todo", "in_progress", "done"])
        .optional()
        .describe("Initial column, defaults to todo"),
    }),
    handler: async ({ title, description, priority, status }) => {
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
  });

  useWebMCP({
    name: "list_tasks",
    description:
      "List tasks on the board, optionally filtered by status (todo, in_progress, done) or priority (low, medium, high).",
    schema: z.object({
      status: z.enum(["todo", "in_progress", "done"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    }),
    handler: async ({ status, priority }) => {
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
  });

  useWebMCP({
    name: "move_task",
    description:
      "Move a task to a different column: todo, in_progress, or done. Requires the task id (use list_tasks to find it).",
    schema: z.object({
      id: z.string().describe("The task's id"),
      status: z.enum(["todo", "in_progress", "done"]),
    }),
    handler: async ({ id, status }) => {
      const task = await moveTask(id, status, "agent");
      return {
        content: [{ type: "text", text: `Moved "${task.title}" to ${status}.` }],
      };
    },
  });

  useWebMCP({
    name: "update_task",
    description:
      "Edit a task's title, description, or priority. Requires the task id (use list_tasks to find it).",
    schema: z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    }),
    handler: async ({ id, ...patch }) => {
      const task = await updateTask(id, { ...patch, source: "agent" });
      return {
        content: [{ type: "text", text: `Updated "${task.title}".` }],
      };
    },
  });

  useWebMCP({
    name: "delete_task",
    description: "Delete a task from the board. Requires the task id.",
    schema: z.object({
      id: z.string(),
    }),
    handler: async ({ id }) => {
      await deleteTask(id);
      return {
        content: [{ type: "text", text: `Deleted task ${id}.` }],
      };
    },
  });

  useWebMCP({
    name: "prioritize_tasks",
    description:
      "Apply a batch of priority (and optional reorder) changes decided by the calling agent. " +
      "The agent has already reasoned about priority using list_tasks — this tool just applies " +
      "the changes atomically, it does not decide priority itself.",
    schema: z.object({
      updates: z
        .array(
          z.object({
            id: z.string().describe("The task's id"),
            priority: z.enum(["low", "medium", "high"]),
            position: z
              .number()
              .optional()
              .describe("Optional new position, for reordering within a column"),
          })
        )
        .describe("Batch of priority updates to apply"),
    }),
    handler: async ({ updates }) => {
      await prioritizeTasks(updates);
      return {
        content: [
          { type: "text", text: `Reprioritized ${updates.length} task(s).` },
        ],
      };
    },
  });

  useWebMCP({
    name: "summarize_board",
    description:
      "Get a natural-language summary of the current state of the board: counts by column and priority.",
    schema: z.object({}),
    handler: async () => {
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
  });
}
