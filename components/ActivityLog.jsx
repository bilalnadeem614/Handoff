"use client";

export default function ActivityLog({ entries }) {
  return (
    <div className="activity-log">
      <div className="activity-log-header">Activity</div>
      <div className="activity-log-body">
        {entries.length === 0 ? (
          <div className="activity-log-empty">No activity yet.</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="activity-entry">
              <span
                className={`activity-dot ${entry.source === "agent" ? "activity-dot-agent" : ""}`}
              />
              <div className="activity-entry-body">
                <div className="activity-message">{entry.message}</div>
                <div className="activity-time">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
