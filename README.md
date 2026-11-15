# Shipboard

A three-column kanban board: To fix / update, In progress, Done.

## Run

```
npm install
npm run build
```

Then open `index.html` in a browser. Use `npm run dev` to rebuild on save.


## Features

- Multiple boards: rename by clicking the title, switch, add or delete from the pill next to it
- Drag cards between columns, or focus a card and press `1` / `2` / `3` to move it; `ArrowUp` / `ArrowDown` move focus
- Priority, assignee, effort points, Blocked flag, Markdown descriptions, checklists and comments
- WIP limit on In progress (click the count to change it), `Archive all` on Done
- Filters (search, tags, priority, Overdue / Due this week tiles), sorting, Board and List views
- Command palette: `Ctrl/Cmd+K`; search: `/`
- Undo toast after deleting or archiving
- Export / import JSON, copy a Markdown summary
- Data is saved in `localStorage` under `shipboard-v2`; `shipboard-v1` data is migrated automatically

## License

MIT
