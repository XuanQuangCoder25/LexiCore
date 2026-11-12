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
import arenaAdminRoutes from './modules/admin/arena-admin.route';
import paymentRoutes from './modules/payment/payment.route';
import examRoutes from './modules/exam/exam.route';
import courseRoute from './modules/course/course.route';
import studentCourseRoute from './modules/course/student-course.route';
import arenaRoute from './modules/arena/arena-word.route';
import notificationRoute from './modules/notification/notification-route';
import { initNotificationCron } from './modules/notification/notification-cron';
import { initSubscriptionCron } from './modules/payment/subscription-cron';
import { initKeepAliveCron } from './utils/keep-alive';
import socialRoute from './modules/social/social.route';
import communityRoute from './modules/community/community.route';
import { initSocialSocket } from './modules/social/social-socket';
import { initArenaSocket } from './modules/arena/arena-socket';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';

const app = express();
const port = process.env.PORT || 5000;
const httpServer = createServer(app);

// Danh sách origin được phép (thêm domain mới vào đây nếu cần)
const allowedOrigins = [
    process.env.CLIENT_URL,            // VD: https://lexicore.site
    'http://localhost:5173',            // Dev local
    'http://localhost:3000',
].filter(Boolean) as string[];

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Cho phép request không có origin (Postman, server-to-server, SePay webhook)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
};

const io = new SocketIO(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

app.use(cors(corsOptions));
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
        app.use('/api/admin/arena', arenaAdminRoutes);
        app.use('/api/exams', examRoutes);

        // --- Course Routes ---
        app.use('/api/courses', courseRoute); // Của Creator/Admin (đã bọc requireCreator)
        app.use('/api/v1/student/courses', studentCourseRoute); // Của Student

        // --- Arena Routes ---
        app.use('/api/arena', arenaRoute);

        // --- Notification & Settings Routes ---
        app.use('/api/notifications', notificationRoute);

        // --- Friends & Direct Messaging Routes ---
        app.use('/api/social', socialRoute);

        // --- Community Routes ---
        app.use('/api/community', communityRoute);

        // --- Payment & Credit Packages ---
        app.use('/api/payment', paymentRoutes);

        // Global Error Handler phải ở cuối
        app.use(globalErrorHandler);

        // Route Health check cho UptimeRobot / Render ping / Keep-alive
        app.get(['/', '/health', '/api/health'], (req, res) => {
            res.json({
                status: 'ok',
                service: 'LexiCore Backend API',
                timestamp: new Date().toISOString(),
                uptimeSec: Math.floor(process.uptime()),
            });
        });

        // Khởi tạo Arena Socket.IO (Xác thực + Real-time handlers)
        initArenaSocket(io);

        // Khởi tạo Socket.IO namespace /chat (Kết bạn & Nhắn tin realtime)
        initSocialSocket(io);

        // Khởi tạo Background Task nhắc nhở học tập (quét DB mỗi phút)
        initNotificationCron();

        // Khởi tạo Subscription Cron (auto-renew 00:05, nhắc hết hạn 09:00 ICT)
        initSubscriptionCron();

        // Khởi tạo Keep-Alive Ping Cron (tự động ping mỗi 10 phút chống Render ngủ đông)
        initKeepAliveCron();

        httpServer.listen(port, () => {
            console.log(`Server đang chạy tại http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Không thể khởi động server do lỗi database:', error);
        process.exit(1);
    }
};

startServer();
