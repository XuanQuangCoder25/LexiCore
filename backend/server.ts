import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectMongoDB } from './config/mongo';
import { connectMySQL } from './config/mysql';
import './config/redis';
import authRoute from './modules/auth/auth-route';
import economyRoute from './modules/economy/economy-route';
import shadowingRoute from './modules/shadowing/shadowing-route';
import { globalErrorHandler } from './middlewares/errorHandler';
import dashboardRoutes from './modules/dashboard/dashboard.route';
import srsRoutes from './modules/srs/srs.route';
import gamificationRoutes from './modules/gamification/gamification-route';
import uploadRoute from './modules/upload/upload.route';
import creatorRoutes from './modules/creator/creator.route';
import creatorApplicationRoutes from './modules/creator/creator-application.route';
import adminRoutes from './modules/admin/admin.route';
import gamificationAdminRoutes from './modules/admin/gamification-admin.route';
import examRoutes from './modules/exam/exam.route';
import courseRoute from './modules/course/course.route';
import studentCourseRoute from './modules/course/student-course.route';
import arenaRoute from './modules/arena/arena-word.route';
import { initArenaSocket } from './modules/arena/arena-socket';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';

const app = express();
const port = process.env.PORT || 5000;
const httpServer = createServer(app);

const io = new SocketIO(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
    }
});

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Đăng ký các Routes
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/srs', srsRoutes);

// Hàm thiết lập kết nối đến tất cả Database
const initializeDatabases = async () => {
    console.log('Đang thiết lập kết nối Databases...');
    await connectMongoDB();
    await connectMySQL();
};

const startServer = async () => {
    try {
        await initializeDatabases();

        // Gắn các Route
        app.use('/api/auth', authRoute);
        app.use('/api/store', economyRoute);
        app.use('/api/shadowing', shadowingRoute);
        app.use('/api/gamification', gamificationRoutes);
        app.use('/api/upload', uploadRoute);
        app.use('/api/v1/creator', creatorRoutes);
        app.use('/api/creator', creatorApplicationRoutes);
        app.use('/api/admin', adminRoutes);
        app.use('/api/admin/gamification', gamificationAdminRoutes);
        app.use('/api/exams', examRoutes);

        // --- Course Routes ---
        app.use('/api/courses', courseRoute); // Của Creator/Admin (đã bọc requireCreator)
        app.use('/api/v1/student/courses', studentCourseRoute); // Của Student

        // --- Arena Routes ---
        app.use('/api/arena', arenaRoute);

        // Global Error Handler phải ở cuối
        app.use(globalErrorHandler);

        // Route test thử
        app.get('/', (req, res) => {
            res.send('LexiCore Backend API is running!');
        });

        // Khởi tạo Arena Socket.IO (Xác thực + Real-time handlers)
        initArenaSocket(io);

        httpServer.listen(port, () => {
            console.log(`Server đang chạy tại http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Không thể khởi động server do lỗi database:', error);
        process.exit(1);
    }
};

startServer();
