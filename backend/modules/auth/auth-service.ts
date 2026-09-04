import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { createUserWithWallet, findUserByEmail, saveOtp, verifyAndDeleteOtp, activateUser } from './auth-repository';
import { AppError } from '../../errors/AppError';

export const registerUser = async (userData: any) => {
    if (!userData.email || !userData.password || !userData.full_name) {
        throw new Error("Vui lòng điền đầy đủ thông tin");
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(userData.password, salt);

    const id = uuidv4();

    const newUserData = {
        id,
        email: userData.email,
        password_hash,
        full_name: userData.full_name
    };

    await createUserWithWallet(newUserData);

    // Sinh OTP và lưu vào Redis (TTL 15 phút)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(userData.email, otp, 'REGISTER');
    // TODO: Gửi OTP qua email (sẽ tích hợp Mailer sau)
    console.log(`[DEV MODE] OTP xác thực cho ${userData.email}: ${otp}`);

    return {
        message: "Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP xác thực.",
        userId: id
    };
};

export const loginUser = async (userData: any) => {
    if (!userData.email || !userData.password) {
        throw new AppError('Vui lòng nhập email và mật khẩu', 400);
    }

    const user = await findUserByEmail(userData.email);
    if (!user) {
        throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    const isPasswordValid = await bcrypt.compare(userData.password, user.password_hash);
    if (!isPasswordValid) {
        throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    if (user.status === 'BANNED') {
        throw new AppError('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.', 403);
    }

    if (user.status === 'PENDING') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await saveOtp(user.email, otp, 'REGISTER');
        // TODO: Gửi OTP qua email (sẽ tích hợp Mailer sau)
        console.log(`[DEV MODE] OTP xác thực cho ${user.email}: ${otp}`);
        throw new AppError('Tài khoản chưa được xác thực. Mã OTP mới đã được gửi tới email của bạn.', 403);
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
    );

    return {
        message: 'Đăng nhập thành công',
        token,
        user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role
        }
    };
};

export const verifyEmail = async (data: any) => {
    if (!data.email || !data.otp_code) {
        throw new AppError('Vui lòng cung cấp email và mã OTP', 400);
    }

    const isValid = await verifyAndDeleteOtp(data.email, data.otp_code, 'REGISTER');
    if (!isValid) {
        throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
    }

    await activateUser(data.email);

    return { message: 'Xác thực email thành công! Tài khoản của bạn đã được kích hoạt.' };
};
