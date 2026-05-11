import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { executeQuery } from '@/lib/database';

// JWT 시크릿 키 (임시)
const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_access_key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "my_super_secret_refresh_key";

// 1. 회원가입 API
// POST /api/v1/auth/register
export async function POST(request: Request) {
    try {
        const { email, password, name } = await request.json();

        // 이메일 중복 검사
        const checkSql = "SELECT id FROM users WHERE email = ?";
        const existingUser = await executeQuery(checkSql, [email]);
        if (existingUser) {
            return NextResponse.json({ success: false, message: "이미 존재하는 이메일입니다." }, {status: 409});
        }

        // 비밀번호 bcrypt 해시 암호화
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // DB에 사용자 정보 저장
        const insertSql = "INSERT INTO users (email, password_hash, name, provider, created_at) VALUES (?, ?, ?, 'local', NOW())";
        const result = await executeQuery(insertSql, [email, password_hash, name]);
        const newUserId = result.insertId;

        //  토큰 발급
        const accessToken = jwt.sign({ userId: newUserId, email }, JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ userId: newUserId }, JWT_REFRESH_SECRET, { expiresIn: '14d' });

        return NextResponse.json({
            success: true,
            message: "회원가입이 완료되었습니다.",
            data: { accessToken, refreshToken, user: { id: newUserId, name, email} }
        }, {status: 200});
    } catch (error) {
        console.error("Signup Error:", error);
        return NextResponse.json({ success: false, message: "회원가입 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
};