import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/tasks/[id] — update a task (title, time, category, completed)
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const body = await req.json()

    const existing = await db.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const data: {
      title?: string
      time?: string
      category?: string
      completed?: boolean
    } = {}

    if (typeof body.title === 'string' && body.title.trim()) {
      data.title = body.title.trim()
    }
    if (typeof body.time === 'string' && /^\d{2}:\d{2}$/.test(body.time)) {
      data.time = body.time
    }
    if (typeof body.category === 'string' && body.category) {
      data.category = body.category
    }
    if (typeof body.completed === 'boolean') {
      data.completed = body.completed
    }

    const task = await db.task.update({ where: { id }, data })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] — delete a task
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params

    const existing = await db.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await db.task.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
