/**
 * 텍스트 → 음성 프록시 (audio/mpeg 바이너리 반환)
 * POST /api/tts
 * Body: { text, voice? }
 * UI_INTEGRATION_GUIDE.md §4-7
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const upstream = await fetch(`${process.env.AI_API_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      return new Response(text || 'upstream error', { status: upstream.status });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('AI /tts error:', err.message);
    return new Response('AI 서버 오류', { status: 500 });
  }
}
