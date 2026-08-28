import 'dotenv/config'; // Load biến môi trường ngay lập tức ở dòng đầu tiên
import express from 'express';
import cors from 'cors';
import { connectMongoDB } from './config/mongo';
import { connectMySQL } from './config/mysql';


const app = express();
const port = process.env.PORT || 5000;

// Cấu hình Middleware
app.use(cors());
app.use(express.json()); // Để server hiểu được data định dạng JSON gửi lên

// Hàm thiết lập kết nối đến tất cả Database
const initializeDatabases = async () => {
    console.log('Đang thiết lập kết nối Databases...');
    await connectMongoDB();
    await connectMySQL();
};

// Hàm khởi động Server
const startServer = async () => {
    try {
        // Phải đợi kết nối DB thành công thì mới mở port cho server chạy
        await initializeDatabases();

        // Route test thử
        app.get('/', (req, res) => {
            res.send('LexiCore Backend API is running!');
        });

        app.listen(port, () => {
            console.log(`Server đang chạy tại http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Không thể khởi động server do lỗi database:', error);
        process.exit(1); // Dừng tiến trình nếu lỗi
    }
};

// Gọi hàm chạy server
startServer();
