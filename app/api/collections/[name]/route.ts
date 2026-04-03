import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET: 해당 컬렉션의 모든 문서 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const client = await clientPromise;
    const db = client.db('ephemera');
    const docs = await db.collection(name).find({}).toArray();
    return NextResponse.json(docs);
  } catch (error) {
    console.error('GET 에러:', error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}

// POST: 새 문서 추가
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db('ephemera');

    const result = await db.collection(name).insertOne({
      ...body,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { success: true, insertedId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST 에러:', error);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}

// PUT: 문서 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('ephemera');

    await db.collection(name).updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT 에러:', error);
    return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  }
}

// DELETE: 문서 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { id } = await req.json();
    const client = await clientPromise;
    const db = client.db('ephemera');

    await db.collection(name).deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE 에러:', error);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
