import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// 1. Cấu hình kết nối API
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

// 2. Cấu hình kho lưu trữ (Storage) kết nối với Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: 'lexicore',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
        };
    },
});

// 3. Xuất middleware upload để dùng trong các Route
export const upload = multer({ storage });