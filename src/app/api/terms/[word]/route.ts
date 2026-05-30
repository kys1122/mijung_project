import { NextResponse } from 'next/server';
import axios from 'axios';
import { executeQuery } from '@/lib/database';

/**
 * [FR-042/043] 행정 용어 조회 및 AI 생성 API
 * GET /api/terms/:word
 */
export async function GET(request: Request, { params }: { params: Promise<{ word: string }>}) {
    try {
        const resolvedParams = await params;
        const word = decodeURIComponent(resolvedParams.word);

        // [FR-042] DB(terms 테이블) 우선 조회
        const sql = "SELECT term, easy_explain FROM terms WHERE term = ?";
        const rows = await executeQuery(sql, [word]);

        if (rows.length > 0) {
            return NextResponse.json({
                success: true,
                data: {
                    term: rows[0].term,
                    easy_explain: rows[0].easy_explain,
                    source: 'database'
                }
            }, {status: 200});
        }

        // [FR-043] DB miss → 챗봇 /terms/explain 호출
        // UI_INTEGRATION_GUIDE.md §4-3
        const lang = new URL(request.url).searchParams.get('lang') ?? 'ko';
        try {
            const aiRes = await axios.post(
                `${process.env.AI_API_URL}/terms/explain`,
                { term: word, question: '', lang },
                { timeout: 30_000 }
            );

            // AI 결과를 캐싱 (다음 호출부터 DB hit)
            try {
                await executeQuery(
                    "INSERT INTO terms (term, easy_explain) VALUES (?, ?)",
                    [word, aiRes.data.easy_explain]
                );
            } catch (cacheErr) {
                console.warn('terms 캐싱 실패(무시):', (cacheErr as any).message);
            }

            return NextResponse.json({
                success: true,
                data: {
                    term: aiRes.data.term,
                    definition: aiRes.data.definition,
                    easy_explain: aiRes.data.easy_explain,
                    source: aiRes.data.source ?? 'ai_generated'
                }
            }, {status: 200});
        } catch (aiErr: any) {
            console.error('AI /terms/explain error:', aiErr.message);
            return NextResponse.json({
                success: true,
                data: {
                    term: word,
                    easy_explain: "현재 사전에 등록되지 않은 용어이며 AI 설명 생성에 실패했습니다.",
                    isAiNeeded: true,
                    source: 'fallback'
                }
            }, {status: 200});
        }
    } catch (err:any) {
        console.error("용어 조회 중 서버 에러 발생:", err);
        return NextResponse.json({
            success: false,
            message: "서버 내부 오류가 발생했습니다.",
            error: err.message
        }, {status: 500});
    }
};
