import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, content, author } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('ephemera')
    const collection = db.collection('posts')

    const result = await collection.insertOne({
      title,
      content,
      author: author || '익명',
      createdAt: new Date(),
    })

    return NextResponse.json(
      { success: true, insertedId: result.insertedId },
      { status: 201 }
    )
  } catch (error) {
    console.error('MongoDB POST 에러:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
