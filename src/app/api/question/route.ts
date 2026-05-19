import { NextResponse } from "next/server";

// // DB/Redis 연동 전, 세션 상태를 임시로 저장할 객체
// export const mockSessions: Record<string, any> = {};

// // 초기 질문 조회 API
// // GET /api/v1/questions/start
// export async function GET() {
//     // 임시 세션 ID 발급 (TODO: Redis 저장)
//     const sessionId = "session-" + Date.now();

//     // 세션 초기화: 1단계부터 시작
//     mockSessions[sessionId] = { step: 1, context: {} };

//     res.status(200).json({
//         success: true,
//         data: {
//             sessionId: sessionId,
//             question: {
//                 step: 1,
//                 question_text: "1. 해당하는 유형을 선택해주세요.",
//                 answer_options_json: ["외국인", "노인", "저소득층", "해당없음"],
//                 input_type: "choice"
//             }
//         }
//     });
// };

// 2. 답변 제출 및 다음 질문/챗봇 응답 반환 API
// POST /api/v1/questions/answer
export async function POST(request : Request) {
    const body = await request.json();
    // const { sessionId, answer, audioInput } = body;
    const {type, age, service, detail, audioInput} = body;

    // 데이터 확인
    if (!type || !age || !service) {
        return NextResponse.json({ success: false, message: "필수 선택 항목 누락" }, {status: 400});
    }

    //음성 인식 테스트 먼저 사용
    const finalDetail = audioInput ? `${audioInput}` : detail;

    const resultResponse = {
        success: true,
        data: {
            chatbot_response: {
                next_step_url: "/list"
            }
        }
    }

    return NextResponse.json(resultResponse, {status:200})

    // // [Q1] 유형 선택 -> 연령대 질문 반환
    // if (session.step === 1) {
    //     session.context.targetType = answer; // 선택한 유형 저장
    //     session.step = 2; // 다음 단계로 이동

    //     return res.status(200).json({
    //         success: true,
    //         data: {
    //             nextQuestion: {
    //                 step: 2,
    //                 question_text: "2. 연령대를 선택해주세요.",
    //                 answer_options_json: ["10대", "20대", "30대", "40대", "50대", "60대 이상"],
    //                 input_type: "choice"
    //             },
    //             currentContext: session.context
    //         }
    //     });
    // }

    // // [Q2] 연령대 선택 -> 서비스 선택 질문 반환
    // if (session.step === 2) {
    //     session.context.ageGroup = answer;
    //     session.step = 3;

    //     return res.status(200).json({
    //         success: true,
    //         data: {
    //             nextQuestion: {
    //                 step: 3,
    //                 question_text: "3. 원하시는 서비스를 선택해주세요.",
    //                 answer_options_json: ["민원", "복지", "주거", "의료"],
    //                 input_type: "choice"
    //             },
    //             currentContext: session.context
    //         }
    //     });
    // }

    // // [Q3] 서비스 선택 -> 세부사항 질문 반환
    // if (session.step === 3) {
    //     session.context.serviceType = answer;
    //     session.step = 4;

    //     return res.status(200).json({
    //         success: true,
    //         data: {
    //             nextQuestion: {
    //                 step: 4,
    //                 question_text: "4. 현재 상황이나 어려움을 작성 (텍스트 또는 마이크 아이콘을 눌러 음성으로 입력)",
    //                 answer_options_json: [],
    //                 input_type: "text_or_audio" // 동적 렌더링 시 텍스트/음성 입력창 표시용
    //             },
    //             currentContext: session.context
    //         }
    //     });
    // }

    // // [Q4] 세부사항(텍스트/음성) 수신 -> AI 챗봇 응답(분류 모듈 호출) 반환
    // if (session.step === 4) {
    //     let finalDetails = answer;

    //     // 음성 입력(audioInput)이 들어온 경우 Whisper API 연동 처리 [1]
    //     if (audioInput) {
    //         // TODO: Whisper API를 호출하여 음성을 텍스트로 변환하는 로직 추가
    //         finalDetails = "(음성 변환 텍스트) " + audioInput;
    //     }

    //     session.context.details = finalDetails;

    //     // TODO: 컨텍스트 JSON을 기반으로 민원 유형 분류 AI(1차 규칙 기반, 2차 GPT 기반) 호출 로직 연동
    //     return res.status(200).json({
    //         success: true,
    //         message: "답변을 생성했습니다",
    //         data: {
    //             currentContext: session.context,
    //             chatbot_response: {
    //                 civil_code: "CUSTOM-001",
    //                 type_name: "맞춤형 행정/복지 안내",
    //                 confidence: 0.95,
    //                 chatbot_message: `${session.context.ageGroup} ${session.context.targetType}${session.context.serviceType}` //답변
    //             }
    //         }
    //     });
    // }
};