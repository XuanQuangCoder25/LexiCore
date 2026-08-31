import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createUserWithWallet } from './auth-repository';

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

    return {
        message: "Đăng ký thành công",
        userId: id
    };
};
