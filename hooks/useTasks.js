"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Shared task state, backed by Supabase Postgres + Realtime.
 * Both the UI (human actions) and the WebMCP tool handlers (agent actions)
 * call the functions returned here, so both stay in sync automatically.
 */
const MAX_LOG_ENTRIES = 20;

const STATUS_LABEL = { todo: "To Do", in_progress: "In Progress", done: "Done" };

// prevRow comes from local state (not payload.old, which Supabase only
// populates with the primary key unless REPLICA IDENTITY FULL is set).
function logMessage(eventType, row, prevRow) {
  const who = row.source === "agent" ? "Agent" : "You";
  const title = row.title ?? prevRow?.title ?? "a task";
  if (eventType === "INSERT") return `${who} created "${title}".`;
  if (eventType === "DELETE") return `${who} deleted "${title}".`;
  if (prevRow && prevRow.status !== row.status) {
    return `${who} moved "${title}" to ${STATUS_LABEL[row.status] ?? row.status}.`;
  }
  if (prevRow && prevRow.priority !== row.priority) {
    return `${who} reprioritized "${title}" to ${row.priority}.`;
  }
  return `${who} updated "${title}".`;
}

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLog, setActivityLog] = useState([]);
  const tasksRef = useRef([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true });
      if (!error && isMounted) setTasks(data ?? []);
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Realtime subscription: any insert/update/delete (from UI or agent) syncs here
  useEffect(() => {
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          const prevRow = tasksRef.current.find(
            (t) => t.id === (payload.new?.id ?? payload.old?.id)
          );

          setTasks((current) => {
            if (payload.eventType === "INSERT") {
              if (current.some((t) => t.id === payload.new.id)) return current;
              return [...current, payload.new].sort(
                (a, b) => a.position - b.position
              );
            }
            if (payload.eventType === "UPDATE") {
              return current.map((t) =>
                t.id === payload.new.id ? payload.new : t
              );
            }
            if (payload.eventType === "DELETE") {
              return current.filter((t) => t.id !== payload.old.id);
            }
            return current;
          });

          const row = payload.new ?? payload.old;
          if (row) {
            setActivityLog((current) =>
              [
                {
                  id: `${row.id}-${payload.eventType}-${Date.now()}`,
                  timestamp: Date.now(),
                  message: logMessage(payload.eventType, row, prevRow),
                  source: row.source ?? prevRow?.source ?? "human",
                },
                ...current,
              ].slice(0, MAX_LOG_ENTRIES)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createTask = useCallback(
    async ({ title, description = "", priority = "medium", status = "todo", source = "human" }) => {
      const position = Date.now(); // simple monotonic ordering
      const { data, error } = await supabase
        .from("tasks")
        .insert([{ title, description, priority, status, source, position }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    []
  );

  const updateTask = useCallback(async (id, patch) => {
    const { data, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const moveTask = useCallback(
    async (id, status, source = "human") => {
      return updateTask(id, { status, source });
    },
    [updateTask]
  );

  const deleteTask = useCallback(async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    return { id };
  }, []);

  const prioritizeTasks = useCallback(
    async (updates) => {
      const results = [];
      for (const { id, priority, position } of updates) {
        const patch = { priority, source: "agent" };
        if (position !== undefined) patch.position = position;
        results.push(await updateTask(id, patch));
      }
      return results;
    },
    [updateTask]
  );

  const listTasks = useCallback(
    ({ status, priority } = {}) => {
      return tasks.filter(
        (t) =>
          (!status || t.status === status) &&
          (!priority || t.priority === priority)
      );
    },
    [tasks]
  );

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    listTasks,
    prioritizeTasks,
    activityLog,
  };
}
