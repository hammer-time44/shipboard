"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { COLS, STORE_KEY, TG, iso, seedTasks, type Column, type Status, type TagKey, type Task } from "@/lib/tasks";
import Drawer from "./Drawer";
import { Cal, Check, Plus, Search } from "./icons";

interface Drop { col: Status; before: number | null }

const RING = 2 * Math.PI * 33;
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Eases a number toward its target so counters roll instead of jumping. */
function useCountUp(target: number): number {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) { from.current = target; setV(target); return; }
    const a = from.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      const val = a + (target - a) * (1 - Math.pow(1 - p, 3));
      from.current = val;
      setV(Math.round(val));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<TagKey[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [today, setToday] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(50);

  // Load saved cards after mount (keeps server and client markup identical).
  useEffect(() => {
    let loaded: Task[] | null = null;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
      if (Array.isArray(saved) && saved.length) loaded = saved as Task[];
    } catch { /* storage unavailable or corrupt: use seed data */ }
    const initial = loaded ?? seedTasks();
    nextId.current = Math.max(50, ...initial.map((t) => t.id + 1));
    setTasks(initial);
    setToday(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); } catch { /* ignore */ }
  }, [tasks, ready]);

  const open = tasks.find((t) => t.id === openId) ?? null;

  const closeDrawer = useCallback(() => {
    setTasks((ts) => ts.map((t) => (t.id === openId && !t.title.trim() ? { ...t, title: "Untitled" } : t)));
    setOpenId(null);
  }, [openId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openId !== null) closeDrawer();
      const tag = (document.activeElement?.tagName ?? "");
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, closeDrawer]);

  const patch = (id: number, p: Partial<Task>) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const move = (id: number, col: Status) =>
    setTasks((ts) => {
      const t = ts.find((x) => x.id === id);
      return t ? [...ts.filter((x) => x.id !== id), { ...t, col }] : ts;
    });
  const remove = (id: number) => { setTasks((ts) => ts.filter((t) => t.id !== id)); setOpenId(null); };
  const add = (col: Status, title: string) =>
    setTasks((ts) => [...ts, { id: nextId.current++, col, title, desc: "", tags: [], due: "", chk: [] }]);

  const drag = (col: Status, before: number | null) => {
    if (dragId === null) return;
    const i = tasks.findIndex((t) => t.id === dragId);
    if (i < 0) return;
    const t = { ...tasks[i], col };
    const rest = tasks.filter((x) => x.id !== dragId);
    const j = before === null ? -1 : rest.findIndex((x) => x.id === before);
    if (j >= 0) rest.splice(j, 0, t); else rest.push(t);
    setTasks(rest);
  };

  const q = query.trim().toLowerCase();
  const visible = (col: Status) =>
    tasks.filter(
      (t) =>
        t.col === col &&
        (!q || t.title.toLowerCase().includes(q) || t.tags.some((g) => TG[g][0].toLowerCase().includes(q))) &&
        (!tagFilter.length || t.tags.some((g) => tagFilter.includes(g))),
    );

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.col === "done").length;
    const now = iso(0), weekEnd = iso(7);
    const openDue = tasks.filter((t) => t.col !== "done" && t.due);
    const counts = COLS.map((c) => tasks.filter((t) => t.col === c.id).length);
    return {
      total,
      done,
      over: openDue.filter((t) => t.due < now).length,
      week: openDue.filter((t) => t.due >= now && t.due <= weekEnd).length,
      counts,
      max: Math.max(1, ...counts),
    };
  }, [tasks]);

  const doneN = useCountUp(stats.done);
  const totalN = useCountUp(stats.total);
  const overN = useCountUp(stats.over);
  const weekN = useCountUp(stats.week);

  // Cards glide to their new spot (FLIP) and new cards rise in.
  const prevPos = useRef<Map<number, { x: number; y: number }>>(new Map());
  const firstPaint = useRef(true);
  useLayoutEffect(() => {
    if (!ready) return;
    const next = new Map<number, { x: number; y: number }>();
    let enter = 0;
    document.querySelectorAll<HTMLElement>(".board .card").forEach((el) => {
      const id = Number(el.dataset.id);
      const r = el.getBoundingClientRect();
      const pos = { x: r.left + scrollX, y: r.top + scrollY };
      next.set(id, pos);
      if (reduced()) return;
      const prev = prevPos.current.get(id);
      if (prev) {
        const dx = prev.x - pos.x, dy = prev.y - pos.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], {
            duration: 460, easing: "cubic-bezier(.2,.8,.2,1)",
          });
        }
      } else {
        el.animate(
          [{ opacity: 0, transform: "translateY(16px) scale(.95)" }, { opacity: 1, transform: "none" }],
          { duration: 560, delay: firstPaint.current ? 560 + enter * 70 : 0, easing: "cubic-bezier(.2,.9,.25,1.08)", fill: "backwards" },
        );
        enter++;
      }
    });
    prevPos.current = next;
    firstPaint.current = false;
  });

  // Cursor light: expose pointer position to glass surfaces as CSS variables.
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".card,.tile,.col");
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - r.left + "px");
        el.style.setProperty("--my", e.clientY - r.top + "px");
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => { document.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  const toggleTag = (k: TagKey) => setTagFilter((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

  return (
    <div className="wrap">
      <header className="top">
        <div className="title">
          <p className="eyebrow" suppressHydrationWarning>{today || " "}</p>
          <h1>ShipBoard</h1>
        </div>
        <div className="tools">
          <label className="search">
            <Search />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search cards"
              aria-label="Search cards"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>/</kbd>
          </label>
        </div>
      </header>

      <section className="stats" aria-label="Summary">
        <div className="tile dark">
          <div className="ring" role="img" aria-label={`${stats.done} of ${stats.total} cards done`}>
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <circle className="trk" cx="40" cy="40" r="33" />
              <circle
                className="val"
                cx="40" cy="40" r="33"
                style={{ strokeDashoffset: RING * (1 - (stats.total ? stats.done / stats.total : 0)) }}
              />
            </svg>
            <b>{doneN}/{totalN}</b>
          </div>
          <span className="cap">Done</span>
        </div>
        <div className="tile">
          <span className="cap">Overdue</span>
          <b className="big" style={stats.over ? { color: "var(--fix)" } : undefined}>{overN}</b>
          <span className="sub">{stats.over === 0 ? "Nothing late" : stats.over === 1 ? "Needs attention" : "Need attention"}</span>
        </div>
        <div className="tile">
          <span className="cap">Due this week</span>
          <b className="big">{weekN}</b>
          <span className="sub">Next 7 days</span>
        </div>
        <div className="tile">
          <span className="cap">By column</span>
          <div className="bars" aria-hidden="true">
            {COLS.map((c, i) => (
              <div key={c.id} style={{ ["--c" as string]: c.c }}>
                <span>{stats.counts[i]}</span>
                <i style={{ height: Math.max(10, (stats.counts[i] / stats.max) * 100) + "%" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="chips" role="group" aria-label="Filter by tag">
        {(Object.keys(TG) as TagKey[]).map((k) => (
          <button key={k} className={"chip" + (tagFilter.includes(k) ? " on" : "")} aria-pressed={tagFilter.includes(k)} onClick={() => toggleTag(k)}>
            <Check />
            {TG[k][0]}
          </button>
        ))}
      </div>

      <main className="board">
        {COLS.map((c) => (
          <ColumnView
            key={c.id}
            col={c}
            list={ready ? visible(c.id) : []}
            filtered={!!q || tagFilter.length > 0}
            dragId={dragId}
            drop={drop?.col === c.id ? drop : null}
            onAdd={(title) => add(c.id, title)}
            onOpen={setOpenId}
            onDragStart={setDragId}
            onDragEnd={() => { setDragId(null); setDrop(null); }}
            onDropAt={(before) => { drag(c.id, before); setDragId(null); setDrop(null); }}
            onHover={(before) => setDrop((d) => (d && d.col === c.id && d.before === before ? d : { col: c.id, before }))}
            onLeave={() => setDrop(null)}
          />
        ))}
      </main>

      <Drawer task={open} onChange={patch} onMove={move} onDelete={remove} onClose={closeDrawer} />
    </div>
  );
}

interface ColProps {
  col: Column;
  list: Task[];
  filtered: boolean;
  dragId: number | null;
  drop: Drop | null;
  onAdd: (title: string) => void;
  onOpen: (id: number) => void;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onDropAt: (before: number | null) => void;
  onHover: (before: number | null) => void;
  onLeave: () => void;
}

function ColumnView({ col, list, filtered, dragId, drop, onAdd, onOpen, onDragStart, onDragEnd, onDropAt, onHover, onLeave }: ColProps) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const close = () => { setText(""); setAdding(false); };
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onAdd(v);
    close();
  };

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const beforeId = (y: number): number | null => {
    const cards = Array.from(boxRef.current?.querySelectorAll<HTMLElement>(".card:not(.drag)") ?? []);
    const hit = cards.find((k) => {
      const r = k.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    return hit ? Number(hit.dataset.id) : null;
  };

  const today = iso(0);

  return (
    <section
      className={"col" + (drop ? " over" : "")}
      style={{ ["--c" as string]: col.c }}
      onDragOver={(e) => {
        if (dragId === null) return;
        e.preventDefault();
        onHover(beforeId(e.clientY));
      }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onLeave(); }}
      onDrop={(e) => {
        e.preventDefault();
        onDropAt(beforeId(e.clientY));
      }}
    >
      <div className="ch">
        <span className="dot" />
        <h2>{col.t}</h2>
        <span className="n">{list.length}</span>
        <span className="sp" />
        <button className="ib" aria-label={`Add card to ${col.t}`} onClick={() => setAdding(true)}><Plus /></button>
      </div>

      <div className={"addf" + (adding ? " open" : "")}>
        <textarea
          ref={inputRef}
          rows={2}
          placeholder="Name this card"
          aria-label="New card"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            if (e.key === "Escape") close();
          }}
        />
        <div className="row">
          <button className="btn" onClick={submit}>Add card</button>
          <button className="btn g" onClick={close}>Cancel</button>
        </div>
      </div>

      <div className="cards" ref={boxRef}>
        {list.length === 0 && <div className="empty">{filtered ? "No matching cards." : col.h}</div>}
        {list.map((t) => {
          const late = t.due !== "" && t.due < today && t.col !== "done";
          const doneN = t.chk.filter((x) => x.d).length;
          const pct = t.chk.length ? Math.round((doneN / t.chk.length) * 100) : 0;
          const date = t.due ? new Date(t.due + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
          return (
            <div key={t.id} style={{ display: "contents" }}>
              {drop && drop.before === t.id && <div className="ln" />}
              <article
                className={"card" + (col.id === "done" ? " fin" : "") + (dragId === t.id ? " drag" : "")}
                draggable
                data-id={t.id}
                tabIndex={0}
                onClick={() => onOpen(t.id)}
                onKeyDown={(e) => { if (e.key === "Enter") onOpen(t.id); }}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(t.id));
                  onDragStart(t.id);
                }}
                onDragEnd={onDragEnd}
              >
                {col.id === "done" && <span className="ok"><Check /></span>}
                <h3>{t.title}</h3>
                {t.desc && <p className="d">{t.desc}</p>}
                <div className="meta">
                  {t.tags.map((g) => (
                    <span key={g} className="pill tg" style={{ ["--c" as string]: TG[g][1] }}>{TG[g][0]}</span>
                  ))}
                  {date && (
                    <span className={"pill" + (late ? " late" : "")}>
                      <Cal />
                      {late ? "Overdue · " : ""}{date}
                    </span>
                  )}
                  {t.chk.length > 0 && (
                    <span className="prg"><i><b style={{ width: pct + "%" }} /></i>{doneN}/{t.chk.length}</span>
                  )}
                </div>
              </article>
            </div>
          );
        })}
        {drop && drop.before === null && list.length > 0 && <div className="ln" />}
        {drop && list.length === 0 && <div className="ln" />}
      </div>
    </section>
  );
}
