import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Hosted speech synthesis has been removed. Use local device speech.' },
    { status: 410 }
  );
}

export async function POST() {
  return GET();
}
