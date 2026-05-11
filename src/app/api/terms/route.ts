import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
// const axios = require('axios'); // AI 연동 시 주석 해제 (npm install axios 필요)

/**
 * [FR-042/043] 행정 용어 조회 및 AI 생성 API
 * GET /api/v1/terms/:word
 */
export async function GET(request: Request, { params }: { params: Promise<{ word: string }>}) {
    try {
        // DB 커넥션 가져오기
        const resolvedParams = await params;
        const word = decodeURIComponent(resolvedParams.word);

        // [FR-042] DB(terms 테이블)에서 먼저 조회
        // DBeaver에서 확인한 mydb 내의 terms 테이블을 사용
        const sql = "SELECT term, easy_explain FROM terms WHERE term = ?";
        const rows = await executeQuery(sql, [word]);

        // DB에 결과가 있는 경우: 즉시 반환
        if (rows.length > 0) {
            return NextResponse.json({
                success: true,
                data: {
                    term: rows[0].term,
                    easy_explain: rows[0].easy_explain,
                    source: 'database' // 출처 표시
                }
            }, {status: 200});
        }

        /**
         * [FR-043] DB에 결과가 없는 경우: AI 연동 로직
         * TODO: AI 담당자에게 엔드포인트와 API KEY를 받으면 아래 로직을 완성시키는 구간
         */
        
        /*// AI API 호출
        const AI_API_URL = process.env.AI_API_URL;
        const AI_API_KEY = process.env.AI_API_KEY;

        const aiResponse = await axios.post(AI_API_URL, {
            term: word,
            prompt: "행정 용어를 어르신도 이해하기 쉽게 설명해줘"
        }, {
            headers: { 'Authorization': `Bearer ${AI_API_KEY}` }
        });

        const generatedExplain = aiResponse.data.explanation;

        // AI가 생성한 내용을 다음에 또 쓸 수 있게 DB에 저장(캐싱)
        await conn.query(
            "INSERT INTO terms (term, easy_explain) VALUES (?, ?)",
            [word, generatedExplain]
        );
        */
        

        // 엔드포인트를 받기 전까지는 안내 메시지를 반환-->
        return NextResponse.json({
            success: true,
            data: {
                term: word,
                easy_explain: "현재 사전에 등록되지 않은 용어입니다. AI를 통해 설명을 생성할 수 있습니다. (연결 대기 중)",
                isAiNeeded: true
            }
        }, {status: 200});

    } catch (err:any) {
        console.error("용어 조회 중 서버 에러 발생:", err);
        NextResponse.json({
            success: false,
            message: "서버 내부 오류가 발생했습니다.",
            error: err.message
        }, {status: 500});
    }
};