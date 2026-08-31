import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectMongoDB } from './config/mongo';
import { connectMySQL } from './config/mysql';
import authRoute from './modules/auth/auth-route';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

        // Route test thử
        app.get('/', (req, res) => {
            res.send('LexiCore Backend API is running!');
        });

        app.listen(port, () => {
            console.log(`Server đang chạy tại http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Không thể khởi động server do lỗi database:', error);
        process.exit(1);
    }
};

startServer();
