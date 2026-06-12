import { NextResponse } from 'next/server';
import { listStorypoints } from '@/lib/store';

export function GET() {
  return NextResponse.json({ storypoints: listStorypoints() });
}
