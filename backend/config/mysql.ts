import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Đảm bảo nạp đúng biến môi trường từ backend/.env kể cả khi chạy script từ root
if (!process.env.MYSQL_URI) {
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
    dotenv.config();
}

// Cấu hình timezone='Z' để đảm bảo mysql2 parse đúng chuẩn UTC từ MySQL server (tránh lệch 7 tiếng múi giờ)
const baseUri = (process.env.MYSQL_URI as string) || '';
const connectionUri = baseUri.includes('?') 
    ? `${baseUri}&timezone=Z` 
    : `${baseUri}?timezone=Z`;

export const pool = mysql.createPool(connectionUri);

export const connectMySQL = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Đã kết nối thành công với Aiven MySQL (Timezone: UTC/Z)!');
        connection.release();
        return pool;
    } catch (error) {
        console.error('Lỗi kết nối MySQL:', error);
        process.exit(1);
    }
};