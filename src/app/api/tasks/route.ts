import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/tasks?date=YYYY-MM-DD — list tasks for a date (or all if no date)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    const tasks = await db.task.findMany({
      where: date ? { date } : undefined,
      orderBy: [{ time: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST /api/tasks — create a new task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, time, category, date } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
    }

    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Task date is required' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        title: title.trim(),
        time: typeof time === 'string' && /^\d{2}:\d{2}$/.test(time) ? time : '08:00',
        category: typeof category === 'string' && category ? category : 'other',
        date,
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
