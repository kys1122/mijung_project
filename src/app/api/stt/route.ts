/**
 * 음성 → 텍스트 프록시 (multipart/form-data)
 * POST /api/stt
 * UI_INTEGRATION_GUIDE.md §4-6
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const upstream = await fetch(`${process.env.AI_API_URL}/stt`, {
      method: 'POST',
      body: formData,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch (err: any) {
    console.error('AI /stt error:', err.message);
    return new Response(JSON.stringify({ error: 'AI 서버 오류' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
