import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { executeQuery } from '@/lib/database';

// JWT 시크릿 키 (임시)
const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_access_key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "my_super_secret_refresh_key";

// 2. 로그인 API
// POST /api/v1/auth/login
export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // 이메일로 사용자 검증
        const sql = "SELECT * FROM users WHERE email = ?";
        const users = await executeQuery(sql, [email]);
        const user = users[0];

        if (!user) {
            return NextResponse.json({ success: false, message: "이메일 또는 비밀번호가 일치하지 않습니다." }, {status: 401});
        }

        // 비밀번호 일치 여부 검증
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json({ success: false, message: "이메일 또는 비밀번호가 일치하지 않습니다." }, { status: 401 });
        }

        // JWT 토큰 발급
        const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '14d' });

        return NextResponse.json({
            success: true,
            message: "로그인에 성공했습니다.",
            data: {
                accessToken,
                refreshToken,
                user: { id: user.id, email: user.email, name: user.name }
            }
        }, {status: 200});
    } catch (error) {
        console.error("Login Error:", error);
        return NextResponse.json({ success: false, message: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
};