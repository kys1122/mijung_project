/**
 * 채팅 스트리밍 프록시 (SSE 패스스루)
 * POST /api/chat/stream
 * UI_INTEGRATION_GUIDE.md §4-8
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const upstream = await fetch(`${process.env.AI_API_URL}/chat/stream`, {
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
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: any) {
    console.error('AI /chat/stream error:', err.message);
    return new Response('AI 서버 오류', { status: 500 });
  }
}
