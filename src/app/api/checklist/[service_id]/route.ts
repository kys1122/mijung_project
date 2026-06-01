import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getEffectiveUserId } from '@/lib/auth';

//  URL에서 괄호, 공백, 한글을 제거하고 순수 주소만 추출하는 안전장치 함수
const getPureLink = (rawLink: string | null) => {
    if (!rawLink) return null;

    let clean = rawLink.replace(/[()\sㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, "").trim();
    
    if (clean && !clean.startsWith('http')) {
        clean = `https://${clean}`;
    }
    return clean;
};

export async function GET(request : Request, {params} : {params: Promise<{service_id: string}>}) {
    try {
        const resolvedParams = await params;
        const service_id = decodeURIComponent(resolvedParams.service_id);

        const userId = await getEffectiveUserId(request);

        // analyze 결과로부터 넘어온 service_name도 지원
        // service_sources에 raw_* 데이터가 없는 서비스도 services 정보만으로 표시되도록 LEFT JOIN
        const serviceSQL = `
            SELECT s.*, ss.raw_required_docs, ss.raw_eligibility, ss.raw_steps
            FROM services s
            LEFT JOIN service_sources ss ON s.id = ss.service_id
            WHERE s.id = ? OR s.service_name = ?
            LIMIT 1`;

        const serviceRows = await executeQuery(serviceSQL, [service_id, service_id]);

        if (!serviceRows || serviceRows.length === 0) return NextResponse.json({ message: "Data not found" }, {status: 404});
        const data = serviceRows[0];

        const progressSql =
            `SELECT item_id FROM checklist_progress WHERE user_id = ? AND service_id = ?`;
        const completedItems: string[] = userId
            ? (await executeQuery(progressSql, [String(userId), data.id])).map((p: any) => p.item_id)
            : [];

        // 신청 자격 확인은 공통 단계. 접수는 오프라인/온라인 트랙으로 분리.
        // track: 'common' = 양쪽 트랙 모두 카운트, 'offline'/'online' = 해당 트랙만
        const offlineLink = getPureLink(data.official_link_method);
        const onlineLink = getPureLink(data.online_method);
        const hasOffline = !!(data.application_steps || offlineLink);
        const hasOnline = !!(data.online_method || onlineLink);

        const steps: any[] = [
            {
                id: 1,
                track: 'common',
                title: "신청 자격 확인하기",
                description: data.eligibility ? data.eligibility.split('\n')[0] : "자격 요건을 확인하세요.",
                isCompleted: completedItems.includes("step_1"),
                link: offlineLink
            }
        ];
        if (hasOffline) {
            steps.push({
                id: 2,
                track: 'offline',
                title: "오프라인으로 신청하기",
                description: data.application_steps || "주민센터 등 오프라인 접수처에서 신청하세요.",
                isCompleted: completedItems.includes("step_2"),
                link: offlineLink
            });
        }
        if (hasOnline) {
            steps.push({
                id: 3,
                track: 'online',
                title: "온라인으로 신청하기",
                description: data.online_method || "온라인 신청 페이지에서 접수하세요.",
                isCompleted: completedItems.includes("step_3"),
                link: onlineLink
            });
        }

        const docRegex = /\((\d+)\)\s*([^(\n<]+)/g;
        let match;
        const documents = [];
        const docSource = data.raw_required_docs || "";

        while ((match = docRegex.exec(docSource)) !== null) {
            const docId = parseInt(match[1]);
            const docTitle = match[2].trim();
            
            if (docTitle.includes("공무원확인") || docTitle.includes("소득 재산 확인")) continue;

            let description = `${docTitle} 서류입니다.`;
            let reqs = ["본인 확인 서류"];
            let warning = null;
            let offlineLoc = "읍면동 행정복지센터(주민센터)";

            if (docTitle.includes("신분증")) {
                description = "본인 확인을 위해 필요한 신원 증명 서류입니다.";
                reqs = ["주민등록증", "운전면허증", "여권 중 하나"];
            } else if (docTitle.includes("신고서") || docTitle.includes("신청서")) {
                description = "기초연금 신청 및 자격 심사를 위한 서류입니다.";
                reqs = ["신청서 양식 (주민센터 비치)"];
            } else if (docTitle.includes("금융정보")) {
                description = "본인 및 배우자의 금융 자산을 확인하기 위한 동의서입니다.";
                reqs = ["본인 및 배우자 서명(인감)"];
                warning = "배우자가 있는 경우 반드시 배우자의 동의 서명이 포함되어야 합니다.";
            } else if (docTitle.includes("통장 사본")) {
                description = "연금을 지급받을 본인 명의의 계좌 확인용 서류입니다.";
                reqs = ["본인 명의의 통장"];
                offlineLoc = "은행 영업점 또는 주민센터";
            }

            documents.push({
                id: docId,
                title: docTitle,
                description: description,
                institution: data.application_steps && data.application_steps.includes("주민센터") ? "주민센터, 복지로" : "해당 기관",
                isCompleted: completedItems.includes(`doc_${docId}`),
                detail: {
                    online: data.online_method ? { name: "복지로", link: getPureLink(data.online_method) } : null,
                    offline: offlineLoc,
                    requirements: reqs,
                    warning: warning
                }
            });
        }

        return NextResponse.json({
            id: data.id,
            name: data.service_name,
            nameEn: "Basic Pension",
            overview: data.service_overview ?? null,
            eligibility: data.eligibility ?? null,
            ministry: data.ministry ?? null,
            department: data.department ?? null,
            fee: data.fee ?? null,
            legal_basis: data.legal_basis ?? null,
            official_link: data.official_link ? data.official_link : (data.official_link_method ?? null),
            online_apply_url: data.online_apply_url ?? null,
            steps: steps,
            document: documents
        }, {status: 200});

    } catch (error) {
        console.error("체크리스트 조회 오류:", error);
        return NextResponse.json({ error: "Server Error" }, {status: 500});
    }
};