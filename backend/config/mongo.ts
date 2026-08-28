import mongoose from 'mongoose';

export const connectMongoDB = async () => {
    try {
        // Ép kiểu as string để TS không báo lỗi khi biến có thể là undefined
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Đã kết nối thành công với MongoDB Atlas!');
    } catch (error) {
        console.error('Lỗi kết nối MongoDB:', error);
        process.exit(1);
    }
};