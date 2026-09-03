"use client";

import { useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import ActivityLog from "./ActivityLog";
import { useTasks } from "../hooks/useTasks";
import { useWebMCPTools } from "../hooks/useWebMCPTools";

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export default function KanbanBoard() {
  const {
    tasks,
    loading,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    listTasks,
    prioritizeTasks,
    activityLog,
  } = useTasks();
  const [newTitle, setNewTitle] = useState("");

  // Registers create_task / list_tasks / move_task / update_task /
  // delete_task / prioritize_tasks / summarize_board as WebMCP tools,
  // wired to the same shared state the UI below uses.
  useWebMCPTools({
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    listTasks,
    prioritizeTasks,
  });

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;
    await moveTask(draggableId, destination.droppableId, "human");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    await createTask({ title, source: "human" });
  };

  if (loading) {
    return <div className="board-loading">Loading board…</div>;
  }

  return (
    <div className="board-wrapper">
      <form className="new-task-form" onSubmit={handleCreate}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task…"
          aria-label="New task title"
        />
        <button type="submit">Add</button>
      </form>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={tasks.filter((t) => t.status === col.id)}
              onDelete={deleteTask}
            />
          ))}
        </div>
      </DragDropContext>

      <ActivityLog entries={activityLog} />
    </div>
  );
}
