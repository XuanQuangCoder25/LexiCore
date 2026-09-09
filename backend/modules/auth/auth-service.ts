import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { createUserWithWallet, findUserByEmail, saveOtp, verifyAndDeleteOtp, checkOtp, activateUser, findUserById, updatePassword, updatePendingUser } from './auth-repository';
import { AppError } from '../../errors/AppError';
import { sendOtpEmail } from '../../utils/mailer';

export const registerUser = async (userData: any) => {
    if (!userData.email || !userData.password || !userData.full_name) {
        throw new AppError('Vui lòng điền đầy đủ thông tin', 400);
    }

    const existingUser = await findUserByEmail(userData.email);

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(userData.password, salt);

    if (existingUser && existingUser.status !== 'PENDING') {
        throw new AppError('Email này đã được sử dụng, vui lòng đăng nhập.', 400);
    }

    if (existingUser && existingUser.status === 'PENDING') {
        await updatePendingUser(existingUser.id, password_hash, userData.full_name);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await saveOtp(userData.email, otp, 'REGISTER');
        await sendOtpEmail(userData.email, otp);

        return {
            message: "Email chưa xác thực. Một mã OTP mới đã được gửi, vui lòng kiểm tra email.",
            userId: existingUser.id
        };
    }

    const id = uuidv4();
    await createUserWithWallet({ id, email: userData.email, password_hash, full_name: userData.full_name });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(userData.email, otp, 'REGISTER');
    await sendOtpEmail(userData.email, otp);

    return {
        message: 'Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP xác thực.',
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
        await sendOtpEmail(user.email, otp);
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

export const getMe = async (userId: string) => {
    const user = await findUserById(userId);
    if (!user) {
        throw new AppError('Không tìm thấy người dùng', 404);
    }
    return user;
};

export const forgotPassword = async (data: any) => {
    if (!data.email) {
        throw new AppError('Vui lòng nhập email', 400);
    }

    const user = await findUserByEmail(data.email);
    if (user) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await saveOtp(data.email, otp, 'FORGOT_PASSWORD');
        await sendOtpEmail(data.email, otp);
    }

    return { message: 'Nếu email tồn tại trong hệ thống, mã OTP sẽ được gửi đến hộp thư của bạn.' };
};

export const resetPassword = async (data: any) => {
    if (!data.email || !data.otp_code || !data.new_password) {
        throw new AppError('Vui lòng cung cấp đầy đủ thông tin', 400);
    }

    const isValid = await verifyAndDeleteOtp(data.email, data.otp_code, 'FORGOT_PASSWORD');
    if (!isValid) {
        throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.new_password, salt);
    await updatePassword(data.email, password_hash);

    return { message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.' };
};

export const resendOtp = async (data: { email: string; mode: 'REGISTER' | 'FORGOT_PASSWORD' }) => {
    if (!data.email || !data.mode) {
        throw new AppError('Vui lòng cung cấp email và mode', 400);
    }

    if (data.mode === 'REGISTER') {
        const user = await findUserByEmail(data.email);
        if (!user || user.status !== 'PENDING') {
            return { message: 'Nếu tài khoản tồn tại và chưa xác thực, mã OTP mới đã được gửi.' };
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await saveOtp(data.email, otp, 'REGISTER');
        await sendOtpEmail(data.email, otp);
    } else {
        const user = await findUserByEmail(data.email);
        if (user) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await saveOtp(data.email, otp, 'FORGOT_PASSWORD');
            await sendOtpEmail(data.email, otp);
        }
    }

    return { message: 'Nếu thông tin hợp lệ, mã OTP mới đã được gửi đến email của bạn.' };
};

export const verifyOtpCode = async (data: { email: string; otp_code: string; mode: 'REGISTER' | 'FORGOT_PASSWORD' }) => {
    if (!data.email || !data.otp_code || !data.mode) {
        throw new AppError('Vui lòng cung cấp đầy đủ thông tin', 400);
    }

    const isValid = await checkOtp(data.email, data.otp_code, data.mode);
    if (!isValid) {
        throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
    }

    return { message: 'Mã OTP hợp lệ' };
};
