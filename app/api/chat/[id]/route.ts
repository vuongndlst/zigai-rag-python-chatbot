import { NextResponse } from 'next/server';
import { auth } from 'auth';
import { getUserCollection } from '@/lib/astra';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coll = await getUserCollection();
    const doc = await coll.findOne({ _id: params.id });

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (doc.user !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      messages: doc.messages,
      title: doc.title,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    console.error('GET /api/chat/:id error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
