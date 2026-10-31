import mysql from 'mysql2/promise';

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