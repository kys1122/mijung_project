import { executeQuery } from "@/lib/database";
import { NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/auth";
import { cachedTranslateBatch } from "@/lib/translate-cache";

const getPureLink = (rawLink : string | null) => {
    if (!rawLink) return null;

    // 정규식을 이용해 텍스트 내부에서 www. 또는 http로 시작하는 진짜 주소 구간만 추출
    const urlRegex = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/i;
    const match = rawLink.match(urlRegex);

    if (match) {
        let clean = match[0].trim();
        // 만약 http나 https가 없이 www로만 시작하면 프로토콜 붙여주기
        if (clean && !clean.startsWith('http')) {
            clean = `https://${clean}`;
        }
        return clean;
    }

    // 만약 주소 형태가 없고 그냥 "복지로", "정부24"라는 텍스트만 있다면 공식 도메인 자동 연결
    if (rawLink.includes("복지로")) return "https://www.bokjiro.go.kr";
    if (rawLink.includes("정부24") || rawLink.includes("정부 24")) return "https://www.gov.kr";

    return null;
};

// GET /api/v1/required-docs/:service_id
export async function GET(request : Request, {params} : {params: Promise<{ service_id: string }>}) {
    try {
        const resolvedParams = await params;
        const service_id = decodeURIComponent(resolvedParams.service_id);

        const userId = await getEffectiveUserId(request);

        // DB 조회 (주소창에 ID 숫자가 오든, 한글 service_name이 오든 둘 다 찾을 수 있게 수정)
        // service_sources 없어도 services 정보로 표시되도록 LEFT JOIN
        const rows = `
            SELECT s.*, ss.raw_required_docs, ss.raw_eligibility, ss.raw_steps
            FROM services s
            LEFT JOIN service_sources ss ON s.id = ss.service_id
            WHERE s.id = ? OR s.service_name = ?
            LIMIT 1`;

        const serviceRows = await executeQuery(rows, [service_id, service_id]);

        if (!serviceRows || serviceRows.length === 0) return NextResponse.json({ message: "Data not found" }, {status:404});
        const data = serviceRows[0];

        // 유저 진행도(체크박스) 조회
        const progress = `SELECT item_id FROM checklist_progress WHERE user_id = ? AND service_id = ?`;
        const completedItems: string[] = userId
            ? (await executeQuery(progress, [String(userId), data.id])).map((p: any) => p.item_id)
            : [];

        // DB의 raw_required_docs에서 줄바꿈 기반으로 서류를 분리 및 매핑
        const documents = [];
        const docSource = data.raw_required_docs || "";
        let currentId = 1; 
        const seenTitles = new Set();

        // 텍스트를 엔터(줄바꿈) 기준으로 한 줄씩 쪼개서 검사
        const lines = docSource.split(/\r?\n/);

        for (let line of lines) {
            let docTitle = line.trim();

            // 방어 코드 1: 빈 줄이거나 마크업 태그, 의미 없는 공백 패스
            if (!docTitle || docTitle.startsWith("<") || docTitle.includes("유형없음") || docTitle.includes("제출서류")) {
                continue;
            }

            // 예외 처리 2: ○, ■, ▣ 같은 목차용 특수문자가 들어간 소제목 행 통째로 차단
            if (docTitle.startsWith("○") || docTitle.startsWith("●") || docTitle.startsWith("■") || docTitle.includes("구비서류") || docTitle.includes("공통서류")) {
                continue;
            }

            // 앞머리에 붙은 (1), 1. 기호 제거뿐만 아니라 하이픈(-)과 기호들도 완벽하게 대청소
            docTitle = docTitle.replace(/^[\(\[\{\-\─\·\•]?\s*\d*[\)\]\}]?\s*[\.\-\─\·\•]?\s*/, "").trim();

            // 예외 처리 3: "신청하는 경우" 같은 안내용 목차 문구 차단
            if (docTitle.includes("신청하는 경우") || docTitle.includes("제출하는 경우")) {
                continue;
            }

            // 예외 처리 4: 신분증 제목 뒤에 붙은 너무 길고 복잡한 찌꺼기 설명 압축 정돈
            if (docTitle.includes("신분증 제시") || docTitle === "신분증" || docTitle.includes("신청자의 신분증")) {
                docTitle = "신분증 제시";
            }

            // 예외 처리 5: 서식지 명칭 간소화
            if (docTitle.includes("행정정보 공동이용 사전동의서")) {
                docTitle = "행정정보 공동이용 사전동의서";
            }

            // 예외 처리 6: 글자가 너무 짧거나 숫자로만 시작하는 이상한 행 최종 차단
            if (!docTitle || docTitle.length < 2 || docTitle.match(/^\d+/)) {
                continue;
            }

            // 예외 처리 7: 불필요한 공무원 확인 문구 차단 (기획서 반영)
            if (
                docTitle.includes("공무원확인") || 
                docTitle.includes("소득 재산 확인") || 
                docTitle.includes("위임장 및 대리인")
            ) {
                continue;
            }

            // 예외 처리 8: 중복된 서류명 한 번 더 걸러내기
            if (seenTitles.has(docTitle)) {
                continue;
            }
            seenTitles.add(docTitle);

            // --- 이 아래 기본값 세팅 및 If-Else 매핑 로직은 기존 코드 ---
            let description = `${docTitle} 서류입니다.`;
            let institution = "주민센터, 복지로";
            let reqs = ["본인 확인 서류"];
            let warning : string | null = null;
            let offlineLoc = "읍면동 행정복지센터(주민센터)";
            let onlineInfo = data.online_method ? { name: "복지로", link: getPureLink(data.online_method) } : null;

            // --- 기획서 조건 매핑 (어떤 타이틀이 들어와도 유연하게 매핑되도록 처리) ---
            if (docTitle.includes("신분증") || docTitle.includes("신분증서")) {
                description = "본인 확인을 위해 필요한 서류입니다.";
                institution = "주민센터, 금융기관";
                reqs = ["주민등록증", "운전면허증", "여권 중 하나"];
                offlineLoc = "주민센터, 금융기관";
                onlineInfo = { name: "정부24", link: "https://www.gov.kr" }; 
                warning = "대리인 신청 시 위임장과 대리인 신분증이 추가로 필요합니다.";

            } else if (docTitle.includes("신고서") || docTitle.includes("신청서")) {
                description = `${data.service_name || "민원"} 신청 및 자격 심사를 위한 서류입니다.`;
                institution = "주민센터, 복지로";
                reqs = ["신청서 양식 (주민센터 비치 또는 다운로드)"];
                offlineLoc = "읍면동 행정복지센터(주민센터) 비치";

            } else if (docTitle.includes("금융정보")) {
                description = "본인 및 배우자의 금융 정보를 제공하기 위한 동의서입니다.";
                institution = "주민센터, 복지로";
                reqs = ["본인 및 배우자 서명 또는 인감"];
                warning = "배우자가 있는 경우 반드시 배우자의 동의 서명이 포함되어야 합니다.";

            } else if (docTitle.includes("통장")) {
                description = "지급받을 본인 명의의 계좌 확인용 서류입니다.";
                institution = "은행 영업점 또는 주민센터";
                reqs = ["본인 명의의 통장"];
                offlineLoc = "은행 영업점 및 인터넷 뱅킹 발급";
                onlineInfo = null; 
                warning = "압류방지 전용통장 이용 시 사전에 확인이 필요합니다.";
            }

            documents.push({
                id: currentId++,
                title: docTitle,
                description: description,
                institution: institution,
                isCompleted: false, // 기본값 탈출
                detail: {
                    online: onlineInfo,
                    offline: offlineLoc,
                    requirements: reqs,
                    warning: warning
                }
            });
        }

        const reqUrl = new URL(request.url);
        const lang = reqUrl.searchParams.get('lang') ?? 'ko';
        let title = data.service_name;
        if (lang !== 'ko') {
            const docTexts = documents.flatMap((d: any) => [
                d.title ?? '', d.description ?? '', d.institution ?? '',
                ...(Array.isArray(d.detail?.requirements) ? d.detail.requirements : []),
                d.detail?.warning ?? ''
            ]);
            try {
                const all = await cachedTranslateBatch([data.service_name, ...docTexts], lang);
                title = all[0] || data.service_name;
                let i = 1;
                for (const d of documents) {
                    d.title = all[i++] || d.title;
                    d.description = all[i++] || d.description;
                    d.institution = all[i++] || d.institution;
                    if (Array.isArray(d.detail?.requirements)) {
                        d.detail.requirements = d.detail.requirements.map(() => all[i++] || '');
                    }
                    if (d.detail) d.detail.warning = all[i++] || d.detail.warning;
                }
            } catch (e) { console.error('required-docs i18n 실패:', e); }
        }

        return NextResponse.json({
            id: data.id,
            title,
            document: documents
        }, {status: 200});

    } catch (error) {
        console.error("필수 서류 조회 오류:", error);
        return NextResponse.json({ error: "Server Error" }, {status: 500});
    }
};