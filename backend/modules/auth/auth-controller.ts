import { Request, Response } from 'express';
import { registerUser } from './auth-service';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await registerUser(req.body);
        res.status(201).json(result);
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: "Email này đã được sử dụng" });
            return;
        }
        res.status(500).json({ error: error.message || "Lỗi máy chủ nội bộ" });
    }
};
