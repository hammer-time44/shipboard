"use client";

import { useState } from "react";
import { COLS, TG, type Status, type TagKey, type Task } from "@/lib/tasks";
import { Check, X } from "./icons";

interface Props {
  task: Task | null;
  onChange: (id: number, patch: Partial<Task>) => void;
  onMove: (id: number, col: Status) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export default function Drawer({ task, onChange, onMove, onDelete, onClose }: Props) {
  const [item, setItem] = useState("");
  const open = task !== null;
  const col = task ? COLS.find((c) => c.id === task.col)! : null;

  const addItem = () => {
    const v = item.trim();
    if (!task || !v) return;
    onChange(task.id, { chk: [...task.chk, { t: v, d: 0 }] });
    setItem("");
  };

  const doneN = task ? task.chk.filter((x) => x.d).length : 0;
  const pct = task && task.chk.length ? Math.round((doneN / task.chk.length) * 100) : 0;

  return (
    <>
      <div className={"scrim" + (open ? " open" : "")} onClick={onClose} />
      <aside className={"dr" + (open ? " open" : "")} aria-label="Card details" aria-hidden={!open}>
        {task && col && (
          <>
            <div className="dh">
              <span className="stat" style={{ ["--c" as string]: col.c }}>
                <span className="dot" />
                {col.t}
              </span>
              <button className="ib" aria-label="Close" onClick={onClose}><X /></button>
            </div>

            <input
              className="t"
              type="text"
              value={task.title}
              aria-label="Card title"
              onChange={(e) => onChange(task.id, { title: e.target.value })}
            />

            <h4>Status</h4>
            <div className="seg track" role="group" aria-label="Status">
              {COLS.map((c) => (
                <button key={c.id} className={"opt sg" + (c.id === task.col ? " on" : "")} onClick={() => onMove(task.id, c.id)}>
                  {c.id === "fix" ? "To fix" : c.t}
                </button>
              ))}
            </div>

            <h4>Description</h4>
            <textarea
              placeholder="Add more detail…"
              value={task.desc}
              onChange={(e) => onChange(task.id, { desc: e.target.value })}
            />

            <h4>Tags</h4>
            <div className="seg">
              {(Object.keys(TG) as TagKey[]).map((k) => {
                const on = task.tags.includes(k);
                return (
                  <button
                    key={k}
                    className={"opt" + (on ? " on" : "")}
                    aria-pressed={on}
                    onClick={() => onChange(task.id, { tags: on ? task.tags.filter((x) => x !== k) : [...task.tags, k] })}
                  >
                    <Check />
                    {TG[k][0]}
                  </button>
                );
              })}
            </div>

            <h4>Due date</h4>
            <input type="date" value={task.due} aria-label="Due date" onChange={(e) => onChange(task.id, { due: e.target.value })} />

            <h4>
              Checklist
              {task.chk.length > 0 && <span>{doneN}/{task.chk.length}</span>}
            </h4>
            {task.chk.length > 0 && <div className="bar"><b style={{ width: pct + "%" }} /></div>}
            {task.chk.map((x, i) => (
              <label key={i} className={"chk" + (x.d ? " d" : "")}>
                <input
                  type="checkbox"
                  checked={!!x.d}
                  onChange={(e) =>
                    onChange(task.id, { chk: task.chk.map((c, j) => (j === i ? { ...c, d: e.target.checked ? 1 : 0 } : c)) })
                  }
                />
                <span>{x.t}</span>
              </label>
            ))}
            <div className="row add">
              <input
                type="text"
                placeholder="Add an item"
                aria-label="New checklist item"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
              />
              <button className="btn" onClick={addItem}>Add</button>
            </div>

            <div className="row foot">
              <button className="btn r" onClick={() => onDelete(task.id)}>Delete card</button>
              <span style={{ flex: 1 }} />
              <button className="btn" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
