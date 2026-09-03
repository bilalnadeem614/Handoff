"use client";

import { Draggable } from "@hello-pangea/dnd";

const PRIORITY_COLOR = {
  low: "#8a8f98",
  medium: "#c98a2e",
  high: "#d1453b",
};

export default function TaskCard({ task, index, onDelete }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card ${task.source === "agent" ? "agent-pulse" : ""}`}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.85 : 1,
          }}
        >
          <div className="task-card-top">
            <span
              className="priority-dot"
              style={{ background: PRIORITY_COLOR[task.priority] || "#8a8f98" }}
              title={`Priority: ${task.priority}`}
            />
            {task.source === "agent" && (
              <span className="agent-badge" title="Last touched by agent">
                agent
              </span>
            )}
            <button
              className="task-delete"
              onClick={() => onDelete(task.id)}
              aria-label="Delete task"
            >
              ×
            </button>
          </div>
          <div className="task-title">{task.title}</div>
          {task.description ? (
            <div className="task-description">{task.description}</div>
          ) : null}
        </div>
      )}
    </Draggable>
  );
}
