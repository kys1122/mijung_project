import { NextResponse } from 'next/server';

// 3. 로그아웃 API
// POST /api/v1/auth/logout
export async function POST(request: Request) {
    try {
        // const { userId } = req.body;

        // // 해당 사용자의 Refresh Token 삭제 (TODO:REDIS)
        // if (mockRedis[userId]) {
        //     delete mockRedis[userId];
        // }

        return NextResponse.json({
            success: true,
            message: "성공적으로 로그아웃 되었습니다."
        });
    } catch (error) {
        return NextResponse.json({ success: false, message: "로그아웃 처리 중 오류가 발생했습니다." });
    }
};