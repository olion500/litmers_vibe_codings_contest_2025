"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type KanbanStatus = {
  id: string;
  name: string;
  color: string;
  wipLimit: number | null;
};

export type KanbanIssue = {
  id: string;
  title: string;
  description: string | null;
  statusId: string;
  priority: string;
  labels: { id: string; label: { id: string; name: string; color: string } }[];
  assignee?: { name: string | null; email: string | null } | null;
  subtasks: { id: string; title: string; completed: boolean }[];
};

type KanbanBoardProps = {
  projectId: string;
  statuses: KanbanStatus[];
  issues: KanbanIssue[];
  moveIssue: (issueId: string, statusId: string, toOrder: number) => Promise<void>;
  updateWip: (formData: FormData) => Promise<void>;
  toggleSubtask: (formData: FormData) => Promise<void>;
  addSubtask: (formData: FormData) => Promise<void>;
};

export function KanbanBoard({ projectId, statuses, issues, moveIssue, updateWip, toggleSubtask, addSubtask }: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const issuesByStatus = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        issues: issues.filter((i) => i.statusId === status.id),
      })),
    [statuses, issues]
  );

  const handleDrop = (statusId: string, index: number) => {
    if (!draggingId) return;
    startTransition(() => moveIssue(draggingId, statusId, index));
    setDraggingId(null);
  };

  return (
    <div className="space-y-2">
      {pending && <p className="text-xs text-muted-foreground">Saving drag changes…</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {issuesByStatus.map(({ status, issues: colIssues }) => {
          const overLimit = status.wipLimit && status.wipLimit > 0 && colIssues.length > status.wipLimit;
          return (
            <Card
              key={status.id}
              className={cn("p-3 space-y-3 border", overLimit && "border-destructive/70")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(status.id, colIssues.length);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold" style={{ color: status.color }}>
                    {status.name}
                  </p>
                  <form action={updateWip} className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <input type="hidden" name="statusId" value={status.id} />
                    <span>WIP</span>
                    <Input type="number" name="wipLimit" min={0} max={50} defaultValue={status.wipLimit ?? 0} className="w-16 px-2 py-1" />
                    <span className="text-[11px]">(0 = ∞)</span>
                    <Button type="submit" size="sm" variant="outline" className="h-7 px-2">
                      Save
                    </Button>
                  </form>
                  {status.wipLimit && status.wipLimit > 0 && (
                    <p className={cn("text-xs", overLimit ? "text-destructive" : "text-muted-foreground")}>Current {colIssues.length}/{status.wipLimit}</p>
                  )}
                </div>
              </div>
              {colIssues.map((issue, idx) => (
                <article
                  key={issue.id}
                  draggable
                  onDragStart={() => setDraggingId(issue.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(status.id, idx);
                  }}
                  className={cn(
                    "rounded-md border p-3 space-y-2 bg-card shadow-sm",
                    draggingId === issue.id && "opacity-60"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <a className="font-semibold hover:underline" href={`/projects/${projectId}/issues/${issue.id}`}>
                        {issue.title}
                      </a>
                      <p className="text-xs text-muted-foreground">#{issue.id.slice(0, 6)}</p>
                    </div>
                    <Badge variant="secondary">{issue.priority}</Badge>
                  </div>
                  {issue.description && <p className="text-sm text-foreground/80 line-clamp-3">{issue.description}</p>}
                  <div className="flex flex-wrap gap-1 text-xs">
                    {issue.labels.map((l) => (
                      <span key={l.id} className="px-2 py-0.5 rounded" style={{ background: l.label.color, color: "white" }}>
                        {l.label.name}
                      </span>
                    ))}
                    {issue.assignee && <Badge variant="outline">{issue.assignee.name || issue.assignee.email}</Badge>}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold">
                      Subtasks {issue.subtasks.filter((s) => s.completed).length}/{issue.subtasks.length}
                    </p>
                    {issue.subtasks.map((st) => (
                      <form key={st.id} action={toggleSubtask} className="flex items-center gap-2 text-xs">
                        <input type="hidden" name="subtaskId" value={st.id} />
                        <input type="hidden" name="completed" value={st.completed ? "false" : "true"} />
                        <Checkbox checked={st.completed} readOnly className="h-3.5 w-3.5" />
                        <span className={st.completed ? "line-through" : ""}>{st.title}</span>
                        <Button type="submit" variant="link" size="sm" className="h-auto px-1 text-[11px]">
                          Toggle
                        </Button>
                      </form>
                    ))}
                    <form action={addSubtask} className="flex items-center gap-2 text-xs">
                      <input type="hidden" name="issueId" value={issue.id} />
                      <Input name="title" placeholder="New subtask" className="flex-1" />
                      <Button type="submit" size="sm" className="h-8">
                        Add
                      </Button>
                    </form>
                  </div>
                </article>
              ))}

              {colIssues.length === 0 && <p className="text-xs text-muted-foreground">No issues</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
