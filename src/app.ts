(() => {
  type Status = "fix" | "prog" | "done";
  type TagKey = "bug" | "design" | "feature" | "research";
  type Priority = "urgent" | "high" | "med" | "low" | "none";
  type Metric = "over" | "week" | null;
  interface CheckItem { t: string; d: 0 | 1 }
  interface Comment { id: number; text: string; at: string }
  interface Task {
    id: number; col: Status; title: string; desc: string; tags: TagKey[]; due: string; chk: CheckItem[];
    priority: Priority; assignee: string; points?: number; blocked?: boolean; blockedBy: number | null;
    comments: Comment[]; archived?: boolean; createdAt: number;
  }
  interface Board { id: string; name: string; wipLimits: Record<Status, number>; tasks: Task[] }
  interface State {
    boards: Board[]; cur: string; theme: "light" | "dark" | "system";
    viewMode: "board" | "list"; sortBy: "manual" | "due" | "priority" | "progress";
  }
  interface Column { id: Status; t: string; c: string; h: string }

  const TG: Record<TagKey, [string, string]> = {
    bug: ["Bug", "#e5484d"], design: ["Design", "#8e4ec6"], feature: ["Feature", "#3e63dd"], research: ["Research", "#12a594"],
  };
  const PRI: Record<Priority, [string, string]> = {
    urgent: ["Urgent", "#e5484d"], high: ["High", "#f5a524"], med: ["Med", "#3e63dd"], low: ["Low", "#8a8e98"], none: ["None", "transparent"],
  };
  const PORD: Priority[] = ["urgent", "high", "med", "low", "none"];
  const COLS: Column[] = [
    { id: "fix", t: "To fix / update", c: "var(--fix)", h: "Nothing to fix right now." },
    { id: "prog", t: "In progress", c: "var(--prog)", h: "Drag a card here when you start it." },
    { id: "done", t: "Done", c: "var(--done)", h: "Finished work lands here." },
  ];
  const STORE_KEY = "shipboard-v2";
  const OLD_KEY = "shipboard-v1";
  const EASE = "cubic-bezier(.3,.7,.2,1)";
  void EASE;

  const ICON = {
    plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
    x: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
    cal: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>`,
    caret: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>`,
    io: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M8 8l4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></svg>`,
  };

  const iso = (o: number): string => {
    const x = new Date(); x.setDate(x.getDate() + o);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };
  const norm = (t: Partial<Task> & { id: number; col: Status; title: string }): Task => ({
    desc: "", tags: [], due: "", chk: [], priority: "med", assignee: "", points: 0, blockedBy: null,
    comments: [], createdAt: Date.now(), ...t,
  });
  const DEFWIP = (): Record<Status, number> => ({ fix: 0, prog: 4, done: 0 });
  const uid = (): string => Math.random().toString(36).slice(2, 9);

  let S: State = {
    boards: [{
      id: "b1", name: "Website relaunch", wipLimits: DEFWIP(),
      tasks: [
        norm({ id: 1, col: "fix", title: "Checkout button misaligned on mobile", desc: "Overlaps the total on screens under 360px.", tags: ["bug"], due: iso(-1), priority: "urgent", assignee: "JK", points: 3, chk: [{ t: "Reproduce on iPhone SE", d: 1 }, { t: "Fix flex wrapping", d: 0 }] }),
        norm({ id: 2, col: "fix", title: "Update pricing page copy", tags: ["design"], due: iso(3), priority: "low" }),
        norm({ id: 3, col: "prog", title: "Redesign the settings screen", desc: "Group options by task, not by system area.", tags: ["design", "feature"], due: iso(5), priority: "high", assignee: "AM", points: 5, chk: [{ t: "Audit current options", d: 1 }, { t: "Sketch new layout", d: 1 }, { t: "Build prototype", d: 0 }] }),
        norm({ id: 4, col: "prog", title: "Interview five new customers", tags: ["research"], priority: "med", blocked: true }),
        norm({ id: 5, col: "done", title: "Set up the project repository", due: iso(-4), priority: "none" }),
      ],
    }],
    cur: "b1", theme: "system", viewMode: "board", sortBy: "manual",
  };

  const rd = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
  const v2 = rd(STORE_KEY) as State | null;
  const v1 = rd(OLD_KEY);
  if (v2 && Array.isArray(v2.boards) && v2.boards.length) {
    S = { ...S, ...v2 };
    S.boards.forEach((b) => { b.tasks = b.tasks.map(norm); b.wipLimits = { ...DEFWIP(), ...b.wipLimits }; });
    if (!S.boards.some((b) => b.id === S.cur)) S.cur = S.boards[0].id;
  } else if (Array.isArray(v1) && v1.length) {
    S.boards[0].tasks = (v1 as Task[]).map(norm); // migrate v1 (v1 key left untouched)
  }
  let nextId = Math.max(50, ...S.boards.flatMap((b) => b.tasks.map((t) => t.id + 1)));
  const B = (): Board => S.boards.find((b) => b.id === S.cur) ?? S.boards[0];

  let dragId: number | null = null;
  let query = "";
  let metric: Metric = null;
  let current: Task | null = null;
  let preview = false;
  let focusId: number | null = null;
  const tagFilter = new Set<TagKey>();
  const priFilter = new Set<Priority>();
  const peek = new Set<number>();

  const save = (): void => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { /* ignore */ } };
  const esc = (s: string): string =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;
  const md = (src: string): string => {
    const inl = (s: string): string => esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    let out = ""; let inUl = false;
    src.split("\n").forEach((l) => {
      const m = /^\s*[-*]\s+(.*)$/.exec(l);
      if (m) { if (!inUl) out += "<ul>"; inUl = true; out += `<li>${inl(m[1])}</li>`; }
      else { if (inUl) out += "</ul>"; inUl = false; if (l.trim()) out += `<p>${inl(l)}</p>`; }
    });
    return out + (inUl ? "</ul>" : "") || `<p class="mut">Nothing to preview.</p>`;
  };
  const avatar = (n: string): string => {
    let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `<span class="av" title="${esc(n)}" style="background:hsl(${h} 70% 85%);color:hsl(${h} 45% 28%)">${esc(n.slice(0, 2).toUpperCase())}</span>`;
  };

  const board = $<HTMLElement>("#board");
  const drawer = $<HTMLElement>("#dr");
  const scrim = $<HTMLElement>("#scrim");
  const toastEl = $<HTMLElement>("#toast");
  const h1 = $<HTMLElement>(".top h1");

  /* ── Theme (persisted) ── */
  const dark = (): boolean => S.theme === "dark" || (S.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const applyTheme = (): void => { if (S.theme === "system") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = S.theme; };
  const toggleTheme = (): void => { S.theme = dark() ? "light" : "dark"; applyTheme(); save(); };
  applyTheme();

  /* ── Toast with undo ── */
  let toastTimer = 0;
  const toast = (msg: string, undo: () => void): void => {
    clearTimeout(toastTimer);
    toastEl.innerHTML = `<span>${esc(msg)}</span><button>Undo</button>`;
    toastEl.classList.add("open");
    toastEl.querySelector("button")!.onclick = () => { undo(); toastEl.classList.remove("open"); clearTimeout(toastTimer); render(); };
    toastTimer = window.setTimeout(() => toastEl.classList.remove("open"), 5000);
  };
  const delTask = (t: Task): void => {
    const ts = B().tasks; const i = ts.indexOf(t); if (i < 0) return;
    ts.splice(i, 1);
    toast("Card deleted", () => { ts.splice(Math.min(i, ts.length), 0, t); });
  };

  /* ── Popover ── */
  let popEl: HTMLElement | null = null;
  const closePop = (): void => { popEl?.remove(); popEl = null; };
  const pop = (a: HTMLElement, items: [string, () => void][]): void => {
    closePop();
    const p = document.createElement("div"); p.className = "pop";
    items.forEach(([l, f]) => { const b = document.createElement("button"); b.textContent = l; b.onclick = () => { closePop(); f(); }; p.appendChild(b); });
    document.body.appendChild(p);
    const r = a.getBoundingClientRect();
    p.style.top = `${r.bottom + scrollY + 8}px`;
    p.style.left = `${Math.max(8, Math.min(r.left + scrollX, innerWidth - 220))}px`;
    popEl = p;
  };
  document.addEventListener("click", (e) => { if (popEl && !popEl.contains(e.target as Node)) closePop(); }, true);

  /* ── Filtering / sorting ── */
  const isOpenDue = (t: Task): boolean => t.col !== "done" && !!t.due;
  const filtersOn = (): boolean => !!(query || tagFilter.size || priFilter.size || metric);
  const matches = (t: Task): boolean => {
    if (t.archived) return false;
    const ql = query.toLowerCase();
    if (ql && !(t.title.toLowerCase().includes(ql) || t.desc.toLowerCase().includes(ql) ||
      t.tags.some((g) => TG[g][0].toLowerCase().includes(ql)) || t.assignee.toLowerCase().includes(ql) ||
      t.chk.some((c) => c.t.toLowerCase().includes(ql)))) return false;
    if (tagFilter.size && !t.tags.some((g) => tagFilter.has(g))) return false;
    if (priFilter.size && !priFilter.has(t.priority)) return false;
    if (metric === "over" && !(isOpenDue(t) && t.due < iso(0))) return false;
    if (metric === "week" && !(isOpenDue(t) && t.due >= iso(0) && t.due <= iso(7))) return false;
    return true;
  };
  const pctOf = (t: Task): number => (t.chk.length ? t.chk.filter((c) => c.d).length / t.chk.length : 0);
  const sorted = (l: Task[]): Task[] => {
    const a = [...l];
    if (S.sortBy === "due") a.sort((x, y) => (x.due || "9") < (y.due || "9") ? -1 : (x.due || "9") > (y.due || "9") ? 1 : 0);
    else if (S.sortBy === "priority") a.sort((x, y) => PORD.indexOf(x.priority) - PORD.indexOf(y.priority));
    else if (S.sortBy === "progress") a.sort((x, y) => pctOf(y) - pctOf(x));
    return a;
  };
  const move = (t: Task, col: Status): void => {
    const ts = B().tasks; ts.splice(ts.indexOf(t), 1); t.col = col; ts.push(t);
  };

  /* ── Columns ── */
  COLS.forEach((c) => {
    const el = document.createElement("section");
    el.className = "col"; el.dataset.c = c.id; el.style.setProperty("--c", c.c);
    el.innerHTML = `<div class="ch"><span class="dot"></span><h2>${c.t}</h2><span class="n"${c.id === "prog" ? ' role="button" tabindex="0" title="Click to set WIP limit"' : ""}></span><span class="sp"></span>${c.id === "done" ? `<button class="chip arch" hidden>Archive all</button>` : ""}<button class="ib" aria-label="Add card to ${c.t}">${ICON.plus}</button></div>
    <div class="addf"><textarea rows="2" placeholder="Name this card" aria-label="New card"></textarea><div class="row" style="margin:0"><button class="btn">Add card</button><button class="btn g">Cancel</button></div></div><div class="cards"></div>`;
    board.appendChild(el);
    const form = el.querySelector<HTMLElement>(".addf")!;
    const input = form.querySelector<HTMLTextAreaElement>("textarea")!;
    const [addBtn, cancelBtn] = Array.from(form.querySelectorAll<HTMLButtonElement>(".btn"));
    const box = el.querySelector<HTMLElement>(".cards")!;
    const closeForm = (): void => { input.value = ""; form.classList.remove("open"); };
    const addCard = (): void => {
      const v = input.value.trim(); if (!v) return;
      B().tasks.push(norm({ id: nextId++, col: c.id, title: v })); closeForm(); render();
    };
    el.querySelector<HTMLButtonElement>(".ch .ib")!.onclick = () => openAdd(c.id);
    addBtn.onclick = addCard; cancelBtn.onclick = closeForm;
    input.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(); }
      if (e.key === "Escape") closeForm();
    };
    const nEl = el.querySelector<HTMLElement>(".n")!;
    if (c.id === "prog") {
      const ask = (): void => {
        const v = prompt("WIP limit for In progress (0 = none)", String(B().wipLimits.prog));
        if (v !== null && /^\d+$/.test(v.trim())) { B().wipLimits.prog = Number(v); render(); }
      };
      nEl.onclick = ask; nEl.onkeydown = (e) => { if (e.key === "Enter") ask(); };
    }
    const arch = el.querySelector<HTMLButtonElement>(".arch");
    if (arch) arch.onclick = () => {
      const ds = B().tasks.filter((t) => t.col === "done" && !t.archived);
      ds.forEach((t) => { t.archived = true; });
      toast(`${ds.length} card${ds.length === 1 ? "" : "s"} archived`, () => ds.forEach((t) => { t.archived = false; }));
      render();
    };

    const line = document.createElement("div"); line.className = "ln";
    const cardAfter = (y: number): HTMLElement | null =>
      Array.from(box.querySelectorAll<HTMLElement>(".card:not(.drag)")).find((k) => { const r = k.getBoundingClientRect(); return y < r.top + r.height / 2; }) ?? null;
    el.ondragover = (e) => { if (dragId === null) return; e.preventDefault(); el.classList.add("over"); box.insertBefore(line, cardAfter(e.clientY)); };
    el.ondragleave = (e) => { if (!el.contains(e.relatedTarget as Node | null)) { el.classList.remove("over"); line.remove(); } };
    el.ondrop = (e) => {
      e.preventDefault(); el.classList.remove("over");
      const next = line.nextElementSibling as HTMLElement | null; line.remove();
      const ts = B().tasks; const i = ts.findIndex((t) => t.id === dragId); if (i < 0) return;
      const [t] = ts.splice(i, 1); t.col = c.id;
      const j = next?.dataset.id ? ts.findIndex((x) => x.id === Number(next.dataset.id)) : -1;
      if (j >= 0) ts.splice(j, 0, t); else ts.push(t);
      dragId = null; render();
    };
  });
  function openAdd(id: Status): void {
    const f = board.querySelector<HTMLElement>(`[data-c="${id}"] .addf`)!;
    f.classList.add("open"); f.querySelector<HTMLTextAreaElement>("textarea")!.focus();
  }

  /* ── Render ── */
  function render(): void {
    board.classList.toggle("list", S.viewMode === "list");
    h1.textContent = B().name;
    $("#bsw").setAttribute("title", `${S.boards.length} board${S.boards.length === 1 ? "" : "s"}`);
    const today = iso(0);
    COLS.forEach((c) => {
      const el = board.querySelector<HTMLElement>(`[data-c="${c.id}"]`)!;
      const box = el.querySelector<HTMLElement>(".cards")!;
      const all = B().tasks.filter((t) => t.col === c.id && !t.archived);
      const list = sorted(all.filter(matches));
      const lim = B().wipLimits[c.id];
      const nEl = el.querySelector<HTMLElement>(".n")!;
      nEl.textContent = lim > 0 ? `${all.length}/${lim}` : String(list.length);
      el.classList.toggle("wip-warn", lim > 0 && all.length === lim);
      el.classList.toggle("wip-over", lim > 0 && all.length > lim);
      const ab = el.querySelector<HTMLElement>(".arch"); if (ab) ab.hidden = all.length === 0;
      box.innerHTML = "";
      if (!list.length) box.innerHTML = `<div class="empty">${filtersOn() ? "No matching cards." : c.h}</div>`;
      list.forEach((t) => {
        const k = document.createElement("article");
        k.className = "card" + (c.id === "done" ? " fin" : "") + (t.blocked ? " blk" : "");
        k.draggable = true; k.dataset.id = String(t.id); k.tabIndex = 0;
        k.style.setProperty("--p", PRI[t.priority][1]);
        const late = t.due !== "" && t.due < today && t.col !== "done";
        const dn = t.chk.filter((x) => x.d).length;
        const dateText = t.due ? new Date(t.due + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
        const open = peek.has(t.id);
        k.innerHTML = `${c.id === "done" ? `<span class="ok">${ICON.check}</span>` : ""}<h3>${esc(t.title)}</h3>${t.desc ? `<p class="d">${esc(t.desc)}</p>` : ""}<div class="meta">${
          t.priority !== "none" ? `<span class="pill pri" style="--c:${PRI[t.priority][1]}">${PRI[t.priority][0]}</span>` : ""}${
          t.blocked ? `<span class="pill blocked">Blocked</span>` : ""}${
          t.tags.map((g) => `<span class="pill tg" style="--c:${TG[g][1]}">${TG[g][0]}</span>`).join("")}${
          dateText ? `<span class="pill${late ? " late" : ""}">${ICON.cal}${late ? "Overdue · " : ""}${dateText}</span>` : ""}${
          t.points ? `<span class="pill pts">${t.points}pt</span>` : ""}${
          t.chk.length ? `<button class="prg" aria-expanded="${open}" aria-label="Toggle subtasks"><i><b style="width:${Math.round(pctOf(t) * 100)}%"></b></i>${dn}/${t.chk.length}</button>` : ""}${
          t.assignee ? avatar(t.assignee) : ""}</div>${
          open ? `<div class="card-subtasks">${t.chk.map((x, i) => `<label class="chk ${x.d ? "d" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}><span>${esc(x.t)}</span></label>`).join("")}</div>` : ""}`;
        const prg = k.querySelector<HTMLElement>(".prg");
        if (prg) prg.onclick = (e) => { e.stopPropagation(); if (peek.has(t.id)) peek.delete(t.id); else peek.add(t.id); render(); };
        k.querySelectorAll<HTMLInputElement>(".card-subtasks input").forEach((cb) => {
          cb.onclick = (e) => e.stopPropagation();
          cb.onchange = () => { t.chk[Number(cb.dataset.i)].d = cb.checked ? 1 : 0; render(); };
        });
        k.querySelector<HTMLElement>(".card-subtasks")?.addEventListener("click", (e) => e.stopPropagation());
        k.ondragstart = (e) => {
          dragId = t.id;
          if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(t.id)); }
          setTimeout(() => k.classList.add("drag"), 0);
        };
        k.ondragend = () => {
          dragId = null; k.classList.remove("drag");
          document.querySelectorAll(".ln").forEach((x) => x.remove());
          document.querySelectorAll(".col.over").forEach((x) => x.classList.remove("over"));
        };
        k.onclick = () => openDrawer(t.id);
        k.onkeydown = (e) => {
          if (e.target !== k) return;
          if (e.key === "Enter") openDrawer(t.id);
          else if (e.key >= "1" && e.key <= "3") { e.preventDefault(); move(t, COLS[Number(e.key) - 1].id); focusId = t.id; render(); }
          else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const sib = (e.key === "ArrowDown" ? k.nextElementSibling : k.previousElementSibling) as HTMLElement | null;
            if (sib?.classList.contains("card")) sib.focus();
          }
        };
        box.appendChild(k);
      });
    });
    renderStats(); renderBar(); save();
    if (focusId !== null) { board.querySelector<HTMLElement>(`.card[data-id="${focusId}"]`)?.focus(); focusId = null; }
  }

  const tileOver = $("#sOver").closest<HTMLElement>(".tile")!;
  const tileWeek = $("#sWeek").closest<HTMLElement>(".tile")!;
  const setMetric = (m: Metric): void => { metric = metric === m ? null : m; render(); };
  ([[tileOver, "over"], [tileWeek, "week"]] as [HTMLElement, Metric][]).forEach(([el, m]) => {
    el.setAttribute("role", "button"); el.tabIndex = 0; el.classList.add("tap");
    el.onclick = () => setMetric(m);
    el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMetric(m); } };
  });

  function renderStats(): void {
    const ts = B().tasks.filter((t) => !t.archived);
    const total = ts.length; const done = ts.filter((t) => t.col === "done").length;
    const today = iso(0); const weekEnd = iso(7);
    const open = ts.filter(isOpenDue);
    const over = open.filter((t) => t.due < today).length;
    const week = open.filter((t) => t.due >= today && t.due <= weekEnd).length;
    const sTot = ts.reduce((n, t) => n + t.chk.length, 0);
    const sDone = ts.reduce((n, t) => n + t.chk.filter((c) => c.d).length, 0);
    $("#ringText").textContent = `${done}/${total}`;
    $("#ringLabel").setAttribute("aria-label", `${done} of ${total} cards done`);
    $("#sSub").textContent = `Subtasks ${sDone}/${sTot}`;
    $("#ring").style.strokeDashoffset = String(2 * Math.PI * 33 * (1 - (total ? done / total : 0)));
    $("#sOver").textContent = String(over);
    $("#sOver").style.color = over ? "var(--fix)" : "";
    $("#sOverSub").textContent = over ? (over === 1 ? "Needs attention" : "Need attention") : "Nothing late";
    $("#sWeek").textContent = String(week);
    tileOver.classList.toggle("on-over", metric === "over"); tileOver.setAttribute("aria-pressed", String(metric === "over"));
    tileWeek.classList.toggle("on-week", metric === "week"); tileWeek.setAttribute("aria-pressed", String(metric === "week"));
    const counts = COLS.map((c) => ts.filter((t) => t.col === c.id).length);
    const max = Math.max(1, ...counts);
    $("#bars").innerHTML = COLS.map((c, i) => `<div style="--c:${c.c}"><span>${counts[i]}</span><i style="height:${Math.max(10, (counts[i] / max) * 100)}%"></i></div>`).join("");
  }

  /* ── Toolbar ── */
  const left = $<HTMLElement>("#chips .chips-left");
  const right = $<HTMLElement>("#chips .chips-right");
  const chipBtns: [HTMLElement, () => boolean][] = [];
  const mkChip = (label: string, get: () => boolean, tog: () => void, color?: string): HTMLButtonElement => {
    const b = document.createElement("button");
    b.className = "chip"; b.setAttribute("aria-pressed", "false");
    if (color) b.style.setProperty("--c", color);
    b.innerHTML = `${ICON.check}${label}`;
    b.onclick = () => { tog(); render(); };
    chipBtns.push([b, get]); left.appendChild(b); return b;
  };
  (Object.keys(TG) as TagKey[]).forEach((k) => mkChip(TG[k][0], () => tagFilter.has(k), () => { if (tagFilter.has(k)) tagFilter.delete(k); else tagFilter.add(k); }));
  left.insertAdjacentHTML("beforeend", `<span class="vr" aria-hidden="true"></span>`);
  (["urgent", "high"] as Priority[]).forEach((p) => mkChip(PRI[p][0], () => priFilter.has(p), () => { if (priFilter.has(p)) priFilter.delete(p); else priFilter.add(p); }));
  const reset = document.createElement("button");
  reset.className = "chip reset"; reset.textContent = "Clear filters"; reset.hidden = true;
  reset.onclick = () => { query = ""; $<HTMLInputElement>("#q").value = ""; tagFilter.clear(); priFilter.clear(); metric = null; render(); };
  left.appendChild(reset);
  right.innerHTML = `<label class="chip selp">Sort <select id="sort" aria-label="Sort cards"><option value="manual">Manual (Drag)</option><option value="due">Due date (Soonest)</option><option value="priority">Priority (Highest)</option><option value="progress">Checklist %</option></select></label>
    <div class="seg track" role="group" aria-label="View"><button class="opt sg" data-v="board">Board</button><button class="opt sg" data-v="list">List</button></div>`;
  const sortSel = $<HTMLSelectElement>("#sort");
  sortSel.onchange = () => { S.sortBy = sortSel.value as State["sortBy"]; render(); };
  right.querySelectorAll<HTMLElement>("[data-v]").forEach((b) => { b.onclick = () => setView(b.dataset.v as State["viewMode"]); });
  function setView(v: State["viewMode"]): void { S.viewMode = v; render(); }
  function renderBar(): void {
    chipBtns.forEach(([b, g]) => { b.classList.toggle("on", g()); b.setAttribute("aria-pressed", String(g())); });
    reset.hidden = !filtersOn();
    sortSel.value = S.sortBy;
    right.querySelectorAll<HTMLElement>("[data-v]").forEach((b) => b.classList.toggle("on", b.dataset.v === S.viewMode));
  }
  $("#today").textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  /* ── Boards, rename, export/import ── */
  h1.setAttribute("contenteditable", "plaintext-only"); h1.spellcheck = false;
  h1.setAttribute("aria-label", "Board name (click to rename)");
  h1.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); h1.blur(); } if (e.key === "Escape") { h1.textContent = B().name; h1.blur(); } };
  h1.onblur = () => { B().name = (h1.textContent ?? "").trim() || "Untitled board"; render(); };
  const newBoard = (): void => {
    const b: Board = { id: uid(), name: "New board", wipLimits: DEFWIP(), tasks: [] };
    S.boards.push(b); S.cur = b.id; render(); h1.focus(); document.getSelection()?.selectAllChildren(h1);
  };
  const delBoard = (): void => {
    if (S.boards.length < 2) { toast("Can't delete the only board", () => undefined); return; }
    const b = B(); const i = S.boards.indexOf(b);
    S.boards.splice(i, 1); S.cur = S.boards[Math.max(0, i - 1)].id;
    toast(`Board “${b.name}” deleted`, () => { S.boards.splice(i, 0, b); S.cur = b.id; });
    render();
  };
  $("#bsw").onclick = (e) => {
    e.stopPropagation();
    pop($("#bsw"), [
      ...S.boards.map((b): [string, () => void] => [(b.id === S.cur ? "✓ " : "") + b.name, () => { S.cur = b.id; render(); }]),
      ["+ New board", newBoard], ["Delete current board", delBoard],
    ]);
  };
  const exportJSON = (): void => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(B(), null, 2)], { type: "application/json" }));
    a.download = `${B().name.replace(/\W+/g, "-").toLowerCase() || "board"}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const markdown = (): string => `# ${B().name}\n\n` + COLS.map((c) => `## ${c.t}\n` + (B().tasks.filter((t) => t.col === c.id && !t.archived).map((t) =>
    `- [${c.id === "done" ? "x" : " "}] ${t.title}${t.priority !== "none" ? ` (${PRI[t.priority][0]})` : ""}${t.due ? ` — due ${t.due}` : ""}${t.assignee ? ` @${t.assignee}` : ""}`).join("\n") || "_Empty_")).join("\n\n");
  const fileIn = document.createElement("input"); fileIn.type = "file"; fileIn.accept = "application/json";
  fileIn.onchange = async () => {
    const f = fileIn.files?.[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text()) as Partial<Board>;
      if (!Array.isArray(j.tasks)) throw new Error("bad");
      const ts = j.tasks.map((t) => norm({ ...t, id: nextId++ } as Task));
      const b: Board = { id: uid(), name: j.name || "Imported board", wipLimits: { ...DEFWIP(), ...j.wipLimits }, tasks: ts };
      S.boards.push(b); S.cur = b.id; render(); toast("Board imported", () => { S.boards.pop(); S.cur = S.boards[0].id; });
    } catch { toast("Import failed: invalid file", () => undefined); }
    fileIn.value = "";
  };
  const copyMd = (): void => { void navigator.clipboard?.writeText(markdown()).then(() => toast("Markdown copied", () => undefined)); };
  $("#io").onclick = (e) => { e.stopPropagation(); pop($("#io"), [["Export JSON", exportJSON], ["Import JSON", () => fileIn.click()], ["Copy Markdown summary", copyMd]]); };

  /* ── Drawer ── */
  function openDrawer(id: number): void {
    const t = B().tasks.find((x) => x.id === id); if (!t) return;
    current = t; preview = false; draw(); drawer.classList.add("open"); scrim.classList.add("open");
  }
  function closeDrawer(): void { drawer.classList.remove("open"); scrim.classList.remove("open"); current = null; render(); }

  function draw(): void {
    const t = current; if (!t) return;
    const colDef = COLS.find((c) => c.id === t.col)!;
    const doneN = t.chk.filter((x) => x.d).length;
    const pct = t.chk.length ? Math.round((doneN / t.chk.length) * 100) : 0;
    drawer.innerHTML = `<div class="dh"><span class="stat" style="--c:${colDef.c}"><span class="dot"></span>${colDef.t}</span><span class="dacts"><button class="pill bl${t.blocked ? " on" : ""}" id="bk" aria-pressed="${!!t.blocked}">Blocked</button><button class="ib" id="dup" aria-label="Duplicate card">${ICON.copy}</button><button class="ib" id="xx" aria-label="Close">${ICON.x}</button></span></div>
    <input class="t" type="text" value="${esc(t.title)}" aria-label="Card title">
    <h4>Status</h4><div class="seg track" role="group" aria-label="Status">${COLS.map((c) => `<button class="opt sg ${c.id === t.col ? "on" : ""}" data-c="${c.id}">${c.id === "fix" ? "To fix" : c.t}</button>`).join("")}</div>
    <div class="meta3"><label><h4>Priority</h4><select id="pr">${PORD.map((p) => `<option value="${p}" ${p === t.priority ? "selected" : ""}>${PRI[p][0]}</option>`).join("")}</select></label>
    <label><h4>Assignee</h4><input type="text" id="as" maxlength="24" placeholder="AB" value="${esc(t.assignee)}"></label>
    <label><h4>Effort</h4><select id="pt">${[0, 1, 2, 3, 5, 8].map((p) => `<option value="${p}" ${p === (t.points ?? 0) ? "selected" : ""}>${p ? p : "None"}</option>`).join("")}</select></label></div>
    <h4>Description<button class="lnk" id="pv">${preview ? "Edit" : "Preview"}</button></h4>${preview ? `<div class="md">${md(t.desc)}</div>` : `<textarea id="ds" placeholder="Add more detail… (Markdown supported)">${esc(t.desc)}</textarea>`}
    <h4>Tags</h4><div class="seg">${(Object.keys(TG) as TagKey[]).map((k) => `<button class="opt ${t.tags.includes(k) ? "on" : ""}" data-g="${k}" aria-pressed="${t.tags.includes(k)}">${ICON.check}${TG[k][0]}</button>`).join("")}</div>
    <h4>Due date</h4><input type="date" id="dd" value="${t.due}">
    <h4>Checklist${t.chk.length ? `<span>${doneN}/${t.chk.length}</span>` : ""}</h4>
    ${t.chk.length ? `<div class="bar"><b style="width:${pct}%"></b></div>` : ""}${t.chk.map((x, i) => `<label class="chk ${x.d ? "d" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}><span data-e="${i}" title="Double-click to edit">${esc(x.t)}</span><button type="button" class="cx" data-r="${i}" aria-label="Remove item">×</button></label>`).join("")}
    <div class="row add"><input type="text" id="ci" placeholder="Add an item" aria-label="New checklist item"><button class="btn" id="cb">Add</button></div>
    <h4>Comments &amp; Activity</h4><div class="cm">${[...t.comments].reverse().map((c) => `<div class="cmi"><p>${esc(c.text)}</p><time>${esc(c.at)}</time></div>`).join("") || `<p class="mut">No activity yet.</p>`}</div>
    <input type="text" id="cn" placeholder="Write a note, press Enter" aria-label="New comment">
    <div class="row foot"><button class="btn r" id="del">Delete card</button><span style="flex:1"></span><button class="btn" id="x">Done</button></div>`;

    drawer.querySelector<HTMLInputElement>(".t")!.oninput = (e) => { t.title = (e.target as HTMLInputElement).value || "Untitled"; };
    const ds = drawer.querySelector<HTMLTextAreaElement>("#ds"); if (ds) ds.oninput = () => { t.desc = ds.value; };
    $("#pv").onclick = () => { preview = !preview; draw(); };
    $<HTMLInputElement>("#dd").onchange = (e) => { t.due = (e.target as HTMLInputElement).value; };
    $<HTMLSelectElement>("#pr").onchange = (e) => { t.priority = (e.target as HTMLSelectElement).value as Priority; };
    $<HTMLSelectElement>("#pt").onchange = (e) => { t.points = Number((e.target as HTMLSelectElement).value); };
    $<HTMLInputElement>("#as").oninput = (e) => { t.assignee = (e.target as HTMLInputElement).value.trim(); };
    $("#bk").onclick = () => { t.blocked = !t.blocked; draw(); };
    $("#dup").onclick = () => {
      const c = norm({ ...t, id: nextId++, title: t.title + " (copy)", chk: t.chk.map((x) => ({ ...x })), tags: [...t.tags], comments: [], createdAt: Date.now() });
      B().tasks.splice(B().tasks.indexOf(t) + 1, 0, c); toast("Card duplicated", () => { B().tasks.splice(B().tasks.indexOf(c), 1); }); closeDrawer();
    };
    drawer.querySelectorAll<HTMLElement>("[data-c]").forEach((b) => { b.onclick = () => { move(t, b.dataset.c as Status); draw(); }; });
    drawer.querySelectorAll<HTMLElement>("[data-g]").forEach((b) => {
      b.onclick = () => { const k = b.dataset.g as TagKey; t.tags = t.tags.includes(k) ? t.tags.filter((x) => x !== k) : [...t.tags, k]; draw(); };
    });
    drawer.querySelectorAll<HTMLInputElement>("[data-i]").forEach((b) => { b.onchange = () => { t.chk[Number(b.dataset.i)].d = b.checked ? 1 : 0; draw(); }; });
    drawer.querySelectorAll<HTMLElement>("[data-r]").forEach((b) => { b.onclick = (e) => { e.preventDefault(); t.chk.splice(Number(b.dataset.r), 1); draw(); }; });
    drawer.querySelectorAll<HTMLElement>("[data-e]").forEach((s) => {
      s.ondblclick = (e) => {
        e.preventDefault(); s.contentEditable = "plaintext-only"; s.focus();
        document.getSelection()?.selectAllChildren(s);
        const done = (): void => { const v = (s.textContent ?? "").trim(); const i = Number(s.dataset.e); if (v) t.chk[i].t = v; else t.chk.splice(i, 1); draw(); };
        s.onblur = done; s.onkeydown = (ev) => { if (ev.key === "Enter") { ev.preventDefault(); s.blur(); } ev.stopPropagation(); };
      };
    });
    const addItem = (): void => {
      const v = $<HTMLInputElement>("#ci").value.trim(); if (!v) return;
      t.chk.push({ t: v, d: 0 }); draw(); $<HTMLInputElement>("#ci").focus();
    };
    $("#cb").onclick = addItem;
    $<HTMLInputElement>("#ci").onkeydown = (e) => { if (e.key === "Enter") addItem(); };
    $<HTMLInputElement>("#cn").onkeydown = (e) => {
      const f = e.target as HTMLInputElement; const v = f.value.trim();
      if (e.key !== "Enter" || !v) return;
      t.comments.push({ id: Date.now(), text: v, at: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) });
      save(); draw(); $<HTMLInputElement>("#cn").focus();
    };
    $("#del").onclick = () => { delTask(t); closeDrawer(); };
    $("#x").onclick = closeDrawer; $("#xx").onclick = closeDrawer;
  }

  /* ── Command palette ── */
  const cmd = $<HTMLElement>("#cmd");
  const cin = cmd.querySelector<HTMLInputElement>("input")!;
  const clist = cmd.querySelector<HTMLElement>(".cl")!;
  let citems: { l: string; f: () => void }[] = []; let csel = 0;
  const commands = (): { l: string; f: () => void }[] => [
    { l: "New card in To Fix", f: () => openAdd("fix") },
    { l: "New card in Progress", f: () => openAdd("prog") },
    { l: "Toggle dark mode", f: toggleTheme },
    { l: "Filter: Overdue", f: () => { metric = "over"; render(); } },
    { l: "Filter: Due this week", f: () => { metric = "week"; render(); } },
    { l: `Switch View: ${S.viewMode === "board" ? "List" : "Board"}`, f: () => setView(S.viewMode === "board" ? "list" : "board") },
    { l: "Export board JSON", f: exportJSON },
    ...B().tasks.filter((t) => !t.archived).map((t) => ({ l: `Go to: ${t.title}`, f: () => openDrawer(t.id) })),
  ];
  const paint = (): void => {
    const q = cin.value.trim().toLowerCase();
    citems = commands().filter((c) => c.l.toLowerCase().includes(q)).slice(0, 9); csel = Math.min(csel, Math.max(0, citems.length - 1));
    clist.innerHTML = citems.map((c, i) => `<button role="option" class="${i === csel ? "on" : ""}" data-i="${i}">${esc(c.l)}</button>`).join("") || `<p class="mut">No matches.</p>`;
    clist.querySelectorAll<HTMLElement>("button").forEach((b) => { b.onclick = () => run(Number(b.dataset.i)); });
  };
  const run = (i: number): void => { const c = citems[i]; closeCmd(); c?.f(); };
  const openCmd = (): void => { cmd.classList.add("open"); cin.value = ""; csel = 0; paint(); cin.focus(); };
  const closeCmd = (): void => cmd.classList.remove("open");
  cin.oninput = () => { csel = 0; paint(); };
  cin.onkeydown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); csel = Math.min(csel + 1, citems.length - 1); paint(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); csel = Math.max(csel - 1, 0); paint(); }
    else if (e.key === "Enter") { e.preventDefault(); run(csel); }
    else if (e.key === "Escape") closeCmd();
  };
  cmd.onclick = (e) => { if (e.target === cmd) closeCmd(); };
  $("#kcmd").onclick = openCmd;

  /* ── Globals ── */
  scrim.onclick = closeDrawer;
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (cmd.classList.contains("open")) closeCmd(); else openCmd(); return; }
    if (e.key === "Escape") { if (popEl) closePop(); else if (current) closeDrawer(); }
    const a = document.activeElement as HTMLElement | null;
    const tag = a?.tagName ?? "";
    if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && !a?.isContentEditable) { e.preventDefault(); $("#q").focus(); }
  });
  $<HTMLInputElement>("#q").oninput = (e) => { query = (e.target as HTMLInputElement).value.trim(); render(); };
  $("#theme").onclick = toggleTheme;

  render();
})();
