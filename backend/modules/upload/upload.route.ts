import { Router, Request, Response } from 'express';
import { upload } from '../../config/cloudinary';

const router = Router();

router.post('/image', upload.single('image'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn một ảnh để upload' });
        }

        const imageUrl = req.file.path;

        res.json({
            success: true,
            message: 'Upload thành công',
            data: { url: imageUrl }
        });
    } catch (error: any) {
        console.error('Error uploading image:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi upload ảnh' });
    }
});

export default router;
