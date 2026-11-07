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
    el.innerHTML = `<div class="ch"><span class="dot"></span><h2>${c.t}</h2><span class="n"></span><button class="ib" aria-label="Add card to ${c.t}">+</button></div>
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
        (t) => t.col === c.id && (!ql || t.title.toLowerCase().includes(ql) || t.tags.some((g) => TG[g][0].toLowerCase().includes(ql))),
      );
      el.querySelector(".n")!.textContent = String(list.length);
      box.innerHTML = "";
      if (!list.length) box.innerHTML = `<div class="empty">${ql ? "No matching cards." : c.h}</div>`;

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
        k.innerHTML = `<h3>${esc(t.title)}</h3><div class="meta">${t.tags
          .map((g) => `<span class="tg" style="--c:${TG[g][1]}">${TG[g][0]}</span>`)
          .join("")}${dateText ? `<span class="${late ? "late" : ""}">${late ? "Overdue · " : ""}${dateText}</span>` : ""}${
          t.chk.length ? `<span>${doneCount}/${t.chk.length}</span>` : ""
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
    const done = tasks.filter((t) => t.col === "done").length;
    $("#pct").textContent = `${done} of ${tasks.length} done`;
    $("#fill").style.width = (tasks.length ? (done / tasks.length) * 100 : 0) + "%";
    save();
  }

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
    drawer.innerHTML = `<input class="t" type="text" value="${esc(t.title)}" aria-label="Card title">
    <h4>Status</h4><div class="seg">${COLS.map((c) => `<button class="opt ${c.id === t.col ? "on" : ""}" data-c="${c.id}">${c.t}</button>`).join("")}</div>
    <h4>Description</h4><textarea id="ds" placeholder="Add more detail…">${esc(t.desc)}</textarea>
    <h4>Tags</h4><div class="seg">${(Object.keys(TG) as TagKey[]).map((k) => `<button class="opt ${t.tags.includes(k) ? "on" : ""}" data-g="${k}">${TG[k][0]}</button>`).join("")}</div>
    <h4>Due date</h4><input type="date" id="dd" value="${t.due}">
    <h4>Checklist</h4>${t.chk.map((x, i) => `<label class="chk ${x.d ? "d" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}><span>${esc(x.t)}</span></label>`).join("")}
    <div class="row"><input type="text" id="ci" placeholder="Add an item"><button class="btn" id="cb">Add</button></div>
    <div class="row" style="margin-top:32px"><button class="btn r" id="del">Delete card</button><span style="flex:1"></span><button class="btn" id="x">Done</button></div>`;

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
