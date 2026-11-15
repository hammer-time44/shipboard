# ShipBoard

A three-column kanban board (To fix / update, In progress, Done) built with Next.js 16 (App Router), React 19 and TypeScript. Black glassmorphism UI with fluid motion.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Features

- Drag cards between columns and reorder them; cards glide to their new position
- Click a card to edit title, status, description, tags, due date and checklist
- Search (press `/`) and filter by tag
- Summary tiles: progress ring, overdue, due this week, cards per column
- Data is saved in your browser's `localStorage`
- Respects `prefers-reduced-motion` and `prefers-reduced-transparency`

## Structure

```
app/            layout, page, global styles (design tokens + motion)
components/     Board (state, drag and drop, stats), Drawer, icons
lib/tasks.ts    types, columns, tags, seed data
```

## Deploy

Push to GitHub and import the repo in Vercel. No configuration needed.

## License

MIT
