import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// 절차별 필요 서류 목록 조회 API
// GET /api/v1/documents/:procedure_id
// documents 테이블에서 특정 절차에 필요한 서류명, 발급 기관, 방법, 수수료, 소요 시간, 온라인 URL을 반환
export async function GET(request: Request, { params }: { params: Promise<{ procedure_id: string }>}) {
    const resolvedParams = await params;
    const procedure_id = resolvedParams.procedure_id;

    // TODO: DB 연동 후 쿼리 작성
    // SELECT doc_name, issue_place, issue_method, fee, processing_time, online_url
    // FROM documents WHERE procedure_id = ?

    const documentsData = [
        {
            id: 1,
            procedure_id: parseInt(procedure_id, 10),
            doc_name: "주민등록등본",
            issue_place: "주민센터 또는 정부24",
            issue_method: "방문, 무인발급기, 온라인",
            fee: "무료(온라인), 400원(방문)",
            processing_time: "즉시",
            online_url: "https://www.gov.kr/portal/main"
        },
        {
            id: 2,
            procedure_id: parseInt(procedure_id, 10),
            doc_name: "가족관계증명서",
            issue_place: "대법원 전자가족관계등록시스템",
            issue_method: "온라인",
            fee: "무료",
            processing_time: "즉시",
            online_url: "https://efamily.scourt.go.kr"
        }
    ]

    // 200 OK 상태 코드와 함께 JSON 데이터 응답
    return NextResponse.json({
        success: true,
        data : documentsData
    }, {status: 200});
};