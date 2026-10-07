import { pool } from '../config/mysql';

// Tự động sinh ID tăng dần theo pattern: prefix_XX
// @param prefix - Ví dụ: 'achievement', 'collection', 'item'
// @param tableName - Tên bảng DB cần query
// @param idColumn - Tên cột ID (default: 'id')

export const generateSequentialId = async (
    prefix: string,
    tableName: string,
    idColumn: string = 'id'
): Promise<string> => {
    const [rows] = await pool.execute(
        `SELECT ${idColumn} FROM ${tableName} WHERE ${idColumn} LIKE ? ORDER BY ${idColumn} DESC LIMIT 1`,
        [`${prefix}_%`]
    ) as any;

    const existing = (rows as any[])[0];

    if (!existing) {
        return `${prefix}_01`;
    }

    const lastId = (existing[idColumn] ?? '') as string;
    // Tách phần số ở cuối: 'achievement_03' → '03' → 3
    const parts = lastId.split('_');
    const lastNum = parseInt(parts[parts.length - 1] || '', 10);

    if (isNaN(lastNum)) {
        return `${prefix}_01`;
    }

    // Tăng lên 1, format lại thành 2 chữ số (hoặc nhiều hơn nếu >= 100)
    const nextNum = lastNum + 1;
    const padded = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    return `${prefix}_${padded}`;
};
