export type Status = "fix" | "prog" | "done";
export type TagKey = "bug" | "design" | "feature" | "research";
export interface CheckItem { t: string; d: 0 | 1 }
export interface Task {
  id: number;
  col: Status;
  title: string;
  desc: string;
  tags: TagKey[];
  due: string;
  chk: CheckItem[];
}
export interface Column { id: Status; t: string; c: string; h: string }

export const TG: Record<TagKey, [string, string]> = {
  bug: ["Bug", "#f0457f"],
  design: ["Design", "#a78bfa"],
  feature: ["Feature", "#6b8cff"],
  research: ["Research", "#2dd4bf"],
};

export const COLS: Column[] = [
  { id: "fix", t: "To fix / update", c: "#f0457f", h: "Nothing to fix right now." },
  { id: "prog", t: "In progress", c: "#f5a524", h: "Drag a card here when you start it." },
  { id: "done", t: "Done", c: "#22c55e", h: "Finished work lands here." },
];

export const STORE_KEY = "shipboard-v1";

/** Local date as YYYY-MM-DD, offset by a number of days from today. */
export const iso = (offsetDays: number): string => {
  const x = new Date();
  x.setDate(x.getDate() + offsetDays);
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${mm}-${dd}`;
};

export const seedTasks = (): Task[] => [
  { id: 1, col: "fix", title: "Checkout button misaligned on mobile", desc: "Overlaps the total on screens under 360px.", tags: ["bug"], due: iso(-1), chk: [{ t: "Reproduce on iPhone SE", d: 1 }, { t: "Fix flex wrapping", d: 0 }] },
  { id: 2, col: "fix", title: "Update pricing page copy", desc: "", tags: ["design"], due: iso(3), chk: [] },
  { id: 3, col: "prog", title: "Redesign the settings screen", desc: "Group options by task, not by system area.", tags: ["design", "feature"], due: iso(5), chk: [{ t: "Audit current options", d: 1 }, { t: "Sketch new layout", d: 1 }, { t: "Build prototype", d: 0 }] },
  { id: 4, col: "prog", title: "Interview five new customers", desc: "", tags: ["research"], due: "", chk: [] },
  { id: 5, col: "done", title: "Set up the project repository", desc: "", tags: [], due: iso(-4), chk: [] },
];
