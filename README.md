# dhiksha12

**DailyFlow — Daily Life Activity Tracker** 🌟

A colourful daily planner web app that helps you organize everyday life — wake up, read, develop skills, work out, and more. Add tasks with times, mark them complete, edit or delete them anytime, and watch your daily progress grow to 100%!

## ✨ Features

- ➕ **Add daily tasks** — custom title, built-in time picker, and 9 colourful categories (Wake Up ☀️, Reading 📚, Skill Development 🧠, Fitness 💪, Work 💼, Meal Time 🍽️, Health 🧘, Sleep 🌙, Other ✨)
- ⚡ **Quick Add** — one-tap colourful preset buttons for common daily activities (with duplicate protection)
- ✅ **Mark complete** — tap the purple check button; it turns green and the task gets a satisfying strikethrough
- ✏️ **Edit tasks** — pre-filled dialog to update title, time, and category
- 🗑️ **Delete tasks** — with a confirmation dialog so nothing disappears by accident
- 📊 **Progress tracking** — animated gradient progress bar, live stats cards (Total / Completed / Pending / Progress %), and motivational messages
- 🎛️ **Filters** — All / Pending / Completed with live counts
- 🕐 **Live clock & date** — always know what time it is
- 📱 **Fully responsive** — works beautifully on mobile and desktop
- ♿ **Accessible** — semantic HTML, ARIA labels, keyboard-friendly

## 🎨 Design

White background with **purple & black buttons**, colourful category badges, smooth Framer Motion animations, and toast notifications for every action.

## 🛠️ Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling   | Tailwind CSS 4 + shadcn/ui           |
| Database  | Prisma ORM + SQLite                  |
| Animation | Framer Motion                        |
| Icons     | Lucide React                         |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and [Bun](https://bun.sh/) (or npm/yarn/pnpm)

### Install & Run

```bash
# 1. Install dependencies
bun install

# 2. Create the SQLite database
bun run db:push

# 3. Start the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and start planning your day!

### Environment

Create a `.env` file in the root with:

```
DATABASE_URL=file:./db/custom.db
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/tasks/route.ts        # GET (list) + POST (create) tasks
│   ├── api/tasks/[id]/route.ts   # PATCH (edit/toggle) + DELETE
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main DailyFlow UI
├── components/ui/                # shadcn/ui components
├── hooks/                        # use-toast, use-mobile
└── lib/db.ts                     # Prisma client
prisma/schema.prisma              # Task model
```

## 📡 API Endpoints

| Method   | Endpoint          | Description              |
| -------- | ----------------- | ------------------------ |
| GET      | `/api/tasks`      | List tasks (by date)     |
| POST     | `/api/tasks`      | Create a new task        |
| PATCH    | `/api/tasks/[id]` | Update / toggle complete |
| DELETE   | `/api/tasks/[id]` | Delete a task            |

---

Built with 💜 as a daily life productivity tool.
