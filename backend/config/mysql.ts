import mysql from 'mysql2/promise';

// Tạo Connection Pool thay vì Connection đơn lẻ (Best practice cho Server xử lý nhiều request)
export const pool = mysql.createPool(process.env.MYSQL_URI as string);

export const connectMySQL = async () => {
    try {
        // Lấy thử 1 connection từ pool để test
        const connection = await pool.getConnection();
        console.log('Đã kết nối thành công với Aiven MySQL!');
        connection.release(); // Trả lại connection cho pool sau khi test xong
        return pool;
    } catch (error) {
        console.error('Lỗi kết nối MySQL:', error);
        process.exit(1);
    }
};