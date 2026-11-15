const p = { viewBox: "0 0 24 24", "aria-hidden": true } as const;

export const Plus = () => <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const X = () => <svg {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const Check = () => <svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const Cal = () => <svg {...p}><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /></svg>;
export const Search = () => <svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
