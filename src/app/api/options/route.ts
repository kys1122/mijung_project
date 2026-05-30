import { NextResponse } from 'next/server';
import axios from 'axios';

// 챗봇 /options 프록시 — user_types, age_groups, categories, languages
export async function GET() {
  try {
    const res = await axios.get(`${process.env.AI_API_URL}/options`, { timeout: 10_000 });
    return NextResponse.json(res.data, { status: 200 });
  } catch (err: any) {
    console.error('AI /options error:', err.message);
    // ui.py와 동일한 fallback
    return NextResponse.json(
      {
        user_types: ['노인/고령자', '저소득층', '외국인', '해당없음'],
        age_groups: ['10대', '20대', '30대', '40대', '50대', '60대 이상'],
        categories: ['민원서류', '복지', '주거', '의료', '생활지원', '출입국', '교육·문화', '잘 모르겠어요'],
      },
      { status: 200 }
    );
  }
}
