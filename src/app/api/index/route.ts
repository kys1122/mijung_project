import { NextResponse } from 'next/server';

/* GET home page. */
export async function GET() {
  NextResponse.json({id: 1, title: 'Express'});
};