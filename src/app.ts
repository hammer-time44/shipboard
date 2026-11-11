(() => {
  type Status = "fix" | "prog" | "done";
  type TagKey = "bug" | "design" | "feature" | "research";
  interface CheckItem { t: string; d: 0 | 1 }
  interface Task {
    id: number;
    col: Status;
    title: string;
    desc: string;
    tags: TagKey[];
    due: string;
    chk: CheckItem[];
  }
  interface Column { id: Status; t: string; c: string; h: string }

  const TG: Record<TagKey, [string, string]> = {
    bug: ["Bug", "#e5484d"],
    design: ["Design", "#8e4ec6"],
    feature: ["Feature", "#3e63dd"],
    research: ["Research", "#12a594"],
  };
  const COLS: Column[] = [
    { id: "fix", t: "To fix / update", c: "var(--fix)", h: "Nothing to fix right now." },
    { id: "prog", t: "In progress", c: "var(--prog)", h: "Drag a card here when you start it." },
    { id: "done", t: "Done", c: "var(--done)", h: "Finished work lands here." },
  ];
  const STORE_KEY = "shipboard-v1";

  const ICON = {
    plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
    x: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
    cal: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/></svg>`,
  };

  const iso = (offsetDays: number): string => {
    const x = new Date();
    x.setDate(x.getDate() + offsetDays);
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${x.getFullYear()}-${mm}-${dd}`;
  };

  let tasks: Task[] = [
    { id: 1, col: "fix", title: "Checkout button misaligned on mobile", desc: "Overlaps the total on screens under 360px.", tags: ["bug"], due: iso(-1), chk: [{ t: "Reproduce on iPhone SE", d: 1 }, { t: "Fix flex wrapping", d: 0 }] },
    { id: 2, col: "fix", title: "Update pricing page copy", desc: "", tags: ["design"], due: iso(3), chk: [] },
    { id: 3, col: "prog", title: "Redesign the settings screen", desc: "Group options by task, not by system area.", tags: ["design", "feature"], due: iso(5), chk: [{ t: "Audit current options", d: 1 }, { t: "Sketch new layout", d: 1 }, { t: "Build prototype", d: 0 }] },
    { id: 4, col: "prog", title: "Interview five new customers", desc: "", tags: ["research"], due: "", chk: [] },
    { id: 5, col: "done", title: "Set up the project repository", desc: "", tags: [], due: iso(-4), chk: [] },
  ];
  let nextId = 50;
  let dragId: number | null = null;
  let query = "";
  const tagFilter = new Set<TagKey>();
  let current: Task | null = null;

  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    if (Array.isArray(saved) && saved.length) {
      tasks = saved as Task[];
      nextId = Math.max(50, ...tasks.map((t) => t.id + 1));
    }
  } catch { /* storage unavailable or corrupt: keep seed data */ }

  const save = (): void => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); } catch { /* ignore */ }
  };
  const esc = (s: string): string =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

  const board = $<HTMLElement>("#board");
  const drawer = $<HTMLElement>("#dr");
  const scrim = $<HTMLElement>("#scrim");

  COLS.forEach((c) => {
    const el = document.createElement("section");
    el.className = "col";
    el.dataset.c = c.id;
    el.style.setProperty("--c", c.c);
    el.innerHTML = `<div class="ch"><span class="dot"></span><h2>${c.t}</h2><span class="n"></span><span class="sp"></span><button class="ib" aria-label="Add card to ${c.t}">${ICON.plus}</button></div>
    <div class="addf"><textarea rows="2" placeholder="Name this card" aria-label="New card"></textarea><div class="row" style="margin:0"><button class="btn">Add card</button><button class="btn g">Cancel</button></div></div><div class="cards"></div>`;
    board.appendChild(el);

    const form = el.querySelector<HTMLElement>(".addf")!;
    const input = form.querySelector<HTMLTextAreaElement>("textarea")!;
    const [addBtn, cancelBtn] = Array.from(form.querySelectorAll<HTMLButtonElement>(".btn"));
    const box = el.querySelector<HTMLElement>(".cards")!;

    const closeForm = (): void => { input.value = ""; form.classList.remove("open"); };
    const addCard = (): void => {
      const v = input.value.trim();
      if (!v) return;
      tasks.push({ id: nextId++, col: c.id, title: v, desc: "", tags: [], due: "", chk: [] });
      closeForm();
      render();
    };
    el.querySelector<HTMLButtonElement>(".ch .ib")!.onclick = () => { form.classList.add("open"); input.focus(); };
    addBtn.onclick = addCard;
    cancelBtn.onclick = closeForm;
    input.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(); }
      if (e.key === "Escape") closeForm();
    };

    const line = document.createElement("div");
    line.className = "ln";
    const cardAfter = (y: number): HTMLElement | null =>
      Array.from(box.querySelectorAll<HTMLElement>(".card:not(.drag)")).find((k) => {
        const r = k.getBoundingClientRect();
        return y < r.top + r.height / 2;
      }) ?? null;

    el.ondragover = (e) => {
      if (dragId === null) return;
      e.preventDefault();
      el.classList.add("over");
      box.insertBefore(line, cardAfter(e.clientY));
    };
    el.ondragleave = (e) => {
      if (!el.contains(e.relatedTarget as Node | null)) { el.classList.remove("over"); line.remove(); }
    };
    el.ondrop = (e) => {
      e.preventDefault();
      el.classList.remove("over");
      const next = line.nextElementSibling as HTMLElement | null;
      line.remove();
      const i = tasks.findIndex((t) => t.id === dragId);
      if (i < 0) return;
      const [t] = tasks.splice(i, 1);
      t.col = c.id;
      const j = next?.dataset.id ? tasks.findIndex((x) => x.id === Number(next.dataset.id)) : -1;
      if (j >= 0) tasks.splice(j, 0, t); else tasks.push(t);
      dragId = null;
      render();
    };
  });

  function render(): void {
    const ql = query.toLowerCase();
    COLS.forEach((c) => {
      const el = board.querySelector<HTMLElement>(`[data-c="${c.id}"]`)!;
      const box = el.querySelector<HTMLElement>(".cards")!;
      const list = tasks.filter(
        (t) =>
          t.col === c.id &&
          (!ql || t.title.toLowerCase().includes(ql) || t.tags.some((g) => TG[g][0].toLowerCase().includes(ql))) &&
          (!tagFilter.size || t.tags.some((g) => tagFilter.has(g))),
      );
      el.querySelector(".n")!.textContent = String(list.length);
      box.innerHTML = "";
      if (!list.length) box.innerHTML = `<div class="empty">${ql || tagFilter.size ? "No matching cards." : c.h}</div>`;

      list.forEach((t) => {
        const k = document.createElement("article");
        k.className = "card" + (c.id === "done" ? " fin" : "");
        k.draggable = true;
        k.dataset.id = String(t.id);
        k.tabIndex = 0;
        const late = t.due !== "" && t.due < iso(0) && t.col !== "done";
        const doneCount = t.chk.filter((x) => x.d).length;
        const dateText = t.due
          ? new Date(t.due + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
          : "";
        const pct = t.chk.length ? Math.round((doneCount / t.chk.length) * 100) : 0;
        k.innerHTML = `${c.id === "done" ? `<span class="ok">${ICON.check}</span>` : ""}<h3>${esc(t.title)}</h3>${
          t.desc ? `<p class="d">${esc(t.desc)}</p>` : ""
        }<div class="meta">${t.tags
          .map((g) => `<span class="pill tg" style="--c:${TG[g][1]}">${TG[g][0]}</span>`)
          .join("")}${
          dateText ? `<span class="pill${late ? " late" : ""}">${ICON.cal}${late ? "Overdue · " : ""}${dateText}</span>` : ""
        }${
          t.chk.length ? `<span class="prg"><i><b style="width:${pct}%"></b></i>${doneCount}/${t.chk.length}</span>` : ""
        }</div>`;
        k.ondragstart = (e) => {
          dragId = t.id;
          if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(t.id)); }
          setTimeout(() => k.classList.add("drag"), 0);
        };
        k.ondragend = () => {
          dragId = null;
          k.classList.remove("drag");
          document.querySelectorAll(".ln").forEach((x) => x.remove());
          document.querySelectorAll(".col.over").forEach((x) => x.classList.remove("over"));
        };
        k.onclick = () => openDrawer(t.id);
        k.onkeydown = (e) => { if (e.key === "Enter") openDrawer(t.id); };
        box.appendChild(k);
      });
    });
    renderStats();
    save();
  }

  function renderStats(): void {
    const total = tasks.length;
    const done = tasks.filter((t) => t.col === "done").length;
    const today = iso(0);
    const weekEnd = iso(7);
    const open = tasks.filter((t) => t.col !== "done" && t.due);
    const over = open.filter((t) => t.due < today).length;
    const week = open.filter((t) => t.due >= today && t.due <= weekEnd).length;

    $("#ringText").textContent = `${done}/${total}`;
    $("#ringLabel").setAttribute("aria-label", `${done} of ${total} cards done`);
    const C = 2 * Math.PI * 33;
    $("#ring").style.strokeDashoffset = String(C * (1 - (total ? done / total : 0)));
    $("#sOver").textContent = String(over);
    $("#sOver").style.color = over ? "var(--fix)" : "";
    $("#sOverSub").textContent = over ? (over === 1 ? "Needs attention" : "Need attention") : "Nothing late";
    $("#sWeek").textContent = String(week);

    const counts = COLS.map((c) => tasks.filter((t) => t.col === c.id).length);
    const max = Math.max(1, ...counts);
    $("#bars").innerHTML = COLS.map(
      (c, i) => `<div style="--c:${c.c}"><span>${counts[i]}</span><i style="height:${Math.max(10, (counts[i] / max) * 100)}%"></i></div>`,
    ).join("");
  }

  const chipsEl = $<HTMLElement>("#chips");
  (Object.keys(TG) as TagKey[]).forEach((k) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = `${ICON.check}${TG[k][0]}`;
    b.onclick = () => {
      if (tagFilter.has(k)) tagFilter.delete(k); else tagFilter.add(k);
      b.classList.toggle("on", tagFilter.has(k));
      b.setAttribute("aria-pressed", String(tagFilter.has(k)));
      render();
    };
    chipsEl.appendChild(b);
  });
  $("#today").textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  function openDrawer(id: number): void {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    current = t;
    draw();
    drawer.classList.add("open");
    scrim.classList.add("open");
  }
  function closeDrawer(): void {
    drawer.classList.remove("open");
    scrim.classList.remove("open");
    current = null;
    render();
  }

  function draw(): void {
    const t = current;
    if (!t) return;
    const colDef = COLS.find((c) => c.id === t.col)!;
    const doneN = t.chk.filter((x) => x.d).length;
    const pct = t.chk.length ? Math.round((doneN / t.chk.length) * 100) : 0;
    drawer.innerHTML = `<div class="dh"><span class="stat" style="--c:${colDef.c}"><span class="dot"></span>${colDef.t}</span><button class="ib" id="xx" aria-label="Close">${ICON.x}</button></div>
    <input class="t" type="text" value="${esc(t.title)}" aria-label="Card title">
    <h4>Status</h4><div class="seg track" role="group" aria-label="Status">${COLS.map((c) => `<button class="opt sg ${c.id === t.col ? "on" : ""}" data-c="${c.id}">${c.id === "fix" ? "To fix" : c.t}</button>`).join("")}</div>
    <h4>Description</h4><textarea id="ds" placeholder="Add more detail…">${esc(t.desc)}</textarea>
    <h4>Tags</h4><div class="seg">${(Object.keys(TG) as TagKey[]).map((k) => `<button class="opt ${t.tags.includes(k) ? "on" : ""}" data-g="${k}" aria-pressed="${t.tags.includes(k)}">${ICON.check}${TG[k][0]}</button>`).join("")}</div>
    <h4>Due date</h4><input type="date" id="dd" value="${t.due}">
    <h4>Checklist${t.chk.length ? `<span>${doneN}/${t.chk.length}</span>` : ""}</h4>
    ${t.chk.length ? `<div class="bar"><b style="width:${pct}%"></b></div>` : ""}${t.chk.map((x, i) => `<label class="chk ${x.d ? "d" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}><span>${esc(x.t)}</span></label>`).join("")}
    <div class="row add"><input type="text" id="ci" placeholder="Add an item" aria-label="New checklist item"><button class="btn" id="cb">Add</button></div>
    <div class="row foot"><button class="btn r" id="del">Delete card</button><span style="flex:1"></span><button class="btn" id="x">Done</button></div>`;

    drawer.querySelector<HTMLInputElement>(".t")!.oninput = (e) => { t.title = (e.target as HTMLInputElement).value || "Untitled"; };
    $<HTMLTextAreaElement>("#ds").oninput = (e) => { t.desc = (e.target as HTMLTextAreaElement).value; };
    $<HTMLInputElement>("#dd").onchange = (e) => { t.due = (e.target as HTMLInputElement).value; };

    drawer.querySelectorAll<HTMLElement>("[data-c]").forEach((b) => {
      b.onclick = () => {
        t.col = b.dataset.c as Status;
        tasks.splice(tasks.indexOf(t), 1);
        tasks.push(t);
        draw();
      };
    });
    drawer.querySelectorAll<HTMLElement>("[data-g]").forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.g as TagKey;
        t.tags = t.tags.includes(k) ? t.tags.filter((x) => x !== k) : [...t.tags, k];
        draw();
      };
    });
    drawer.querySelectorAll<HTMLInputElement>("[data-i]").forEach((b) => {
      b.onchange = () => { t.chk[Number(b.dataset.i)].d = b.checked ? 1 : 0; draw(); };
    });

    const addItem = (): void => {
      const field = $<HTMLInputElement>("#ci");
      const v = field.value.trim();
      if (!v) return;
      t.chk.push({ t: v, d: 0 });
      draw();
      $<HTMLInputElement>("#ci").focus();
    };
    $("#cb").onclick = addItem;
    $<HTMLInputElement>("#ci").onkeydown = (e) => { if (e.key === "Enter") addItem(); };
    $("#del").onclick = () => { tasks = tasks.filter((x) => x !== t); closeDrawer(); };
    $("#x").onclick = closeDrawer;
    $("#xx").onclick = closeDrawer;
  }

  scrim.onclick = closeDrawer;
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && current) closeDrawer();
    const tag = document.activeElement?.tagName ?? "";
    if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); $("#q").focus(); }
  });
  $<HTMLInputElement>("#q").oninput = (e) => { query = (e.target as HTMLInputElement).value.trim(); render(); };
  $("#theme").onclick = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
  };

  render();
})();
