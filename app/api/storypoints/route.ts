import { NextResponse } from 'next/server';
import { listStorypoints } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ storypoints: await listStorypoints() });
}
