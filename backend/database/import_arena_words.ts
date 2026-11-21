/**
 * import_arena_words.ts
 *
 * Script đọc file CSV từ vựng và nạp vào bảng `arena_words` trong MySQL.
 *
 * Cách dùng:
 *   npx tsx backend/database/import_arena_words.ts
 *   npx tsx backend/database/import_arena_words.ts --clean   (Xóa từ cũ trước khi nạp mới)
 *   npx tsx backend/database/import_arena_words.ts --file=duong_dan_file.csv
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { connectMySQL, pool } from '../config/mysql';
import { VALID_LEVELS, VALID_TYPES, ArenaWordInput } from '../modules/arena/arena-word.repository';

// Hàm phân tích 1 dòng CSV chuẩn RFC 4180 (xử lý dấu ngoặc kép, dấu phẩy bên trong chuỗi)
function parseCsvLine(text: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQuotes && text[i + 1] === '"') {
                cur += '"';
                i++; // Bỏ qua escape quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur.trim());
    return result;
}

async function run() {
    const args = process.argv.slice(2);
    const shouldClean = args.includes('--clean');
    const fileArg = args.find((a) => a.startsWith('--file='));
    const filePath = fileArg
        ? path.resolve(fileArg.split('=')[1])
        : path.join(__dirname, 'arena_words_seed.csv');

    console.log('----------------------------------------------------');
    console.log('🚀 BẮT ĐẦU QUY TRÌNH IMPORT TỪ VỰNG ARENA');
    console.log(`📁 Đường dẫn tệp CSV: ${filePath}`);
    console.log(`🧹 Tùy chọn xóa dữ liệu cũ (--clean): ${shouldClean ? 'CÓ' : 'KHÔNG'}`);
    console.log('----------------------------------------------------');

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Không tìm thấy tệp CSV tại: ${filePath}`);
        process.exit(1);
    }

    await connectMySQL();

    if (shouldClean) {
        console.log('⏳ Đang xóa sạch từ vựng cũ trong bảng `arena_words`...');
        try {
            await pool.execute('DELETE FROM arena_match_words');
            await pool.execute('DELETE FROM arena_words');
            console.log('✅ Đã xóa sạch dữ liệu cũ thành công.');
        } catch (err: any) {
            console.error('⚠️ Lỗi khi xóa dữ liệu cũ:', err.message);
        }
    }

    const rawContent = fs.readFileSync(filePath, 'utf8');
    // Loại bỏ BOM nếu có
    const cleanContent = rawContent.charCodeAt(0) === 0xfeff ? rawContent.slice(1) : rawContent;
    const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length <= 1) {
        console.log('⚠️ Tệp CSV không có dữ liệu (chỉ có dòng tiêu đề hoặc rỗng).');
        await pool.end();
        return;
    }

    // Đọc header
    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const idxWord = headers.indexOf('word');
    const idxMeaning = headers.indexOf('meaning');
    const idxTopic = headers.indexOf('topic');
    const idxLevel = headers.indexOf('level');
    const idxType = headers.indexOf('word_type');
    const idxExample = headers.indexOf('example');

    if (idxWord === -1 || idxMeaning === -1 || idxTopic === -1 || idxLevel === -1 || idxType === -1) {
        console.error('❌ Tệp CSV thiếu các cột bắt buộc: word, meaning, topic, level, word_type');
        console.error('Cột tìm thấy:', headers);
        await pool.end();
        process.exit(1);
    }

    const validWords: ArenaWordInput[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cols = parseCsvLine(line);
        const rowNum = i + 1;

        const word = cols[idxWord]?.trim();
        const meaning = cols[idxMeaning]?.trim();
        const topic = cols[idxTopic]?.trim().toLowerCase();
        const level = cols[idxLevel]?.trim().toUpperCase() as any;
        const wordType = cols[idxType]?.trim().toLowerCase() as any;
        const example = idxExample !== -1 ? cols[idxExample]?.trim() || null : null;

        if (!word || !meaning || !topic) {
            errors.push(`Dòng ${rowNum}: Thiếu word, meaning hoặc topic`);
            continue;
        }

        if (!VALID_LEVELS.includes(level)) {
            errors.push(`Dòng ${rowNum} (${word}): Level "${level}" không hợp lệ. Cho phép: ${VALID_LEVELS.join(', ')}`);
            continue;
        }

        if (!VALID_TYPES.includes(wordType)) {
            errors.push(`Dòng ${rowNum} (${word}): Loại từ "${wordType}" không hợp lệ. Cho phép: ${VALID_TYPES.join(', ')}`);
            continue;
        }

        validWords.push({
            word,
            meaning,
            topic,
            level,
            word_type: wordType,
            example: example || undefined,
        });
    }

    if (errors.length > 0) {
        console.log(`⚠️ Phát hiện ${errors.length} dòng có lỗi định dạng:`);
        errors.slice(0, 10).forEach((e) => console.log('   - ' + e));
        if (errors.length > 10) console.log(`   ... và ${errors.length - 10} lỗi khác.`);
    }

    console.log(`📊 Số từ hợp lệ sẵn sàng nạp: ${validWords.length}`);

    if (validWords.length === 0) {
        console.log('⚠️ Không có từ vựng hợp lệ nào để nạp.');
        await pool.end();
        return;
    }

    // Nạp theo từng đợt (batch) 100 từ để tối ưu hiệu năng và không vượt quá max_allowed_packet
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < validWords.length; i += BATCH_SIZE) {
        const chunk = validWords.slice(i, i + BATCH_SIZE);
        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, NULL)').join(', ');
        const values: any[] = [];

        for (const w of chunk) {
            values.push(
                uuidv4(),
                w.word,
                w.meaning,
                w.topic,
                w.level,
                w.word_type,
                w.example || null
            );
        }

        const query = `
            INSERT INTO arena_words (id, word, meaning, topic, level, word_type, example, created_by)
            VALUES ${placeholders}
        `;

        await pool.execute(query, values);
        insertedCount += chunk.length;
        process.stdout.write(`⏳ Đã nạp ${insertedCount}/${validWords.length} từ...\r`);
    }

    console.log(`\n🎉 NẠP THÀNH CÔNG TỔNG CỘNG ${insertedCount} TỪ VỰNG VÀO DATABASE!`);

    // Thống kê theo chủ đề
    const [topicStats]: any = await pool.execute(`
        SELECT topic, COUNT(*) as total,
               SUM(CASE WHEN level IN ('A1','A2') THEN 1 ELSE 0 END) as beginner,
               SUM(CASE WHEN level IN ('B1','B2') THEN 1 ELSE 0 END) as intermediate,
               SUM(CASE WHEN level IN ('C1','C2') THEN 1 ELSE 0 END) as advanced
        FROM arena_words
        GROUP BY topic
        ORDER BY topic ASC
    `);

    console.log('\n📈 BẢNG THỐNG KÊ KHO TỪ VỰNG HIỆN TẠI TRONG DATABASE:');
    console.table(topicStats);

    await pool.end();
    console.log('🏁 Hoàn tất.');
}

run().catch((err) => {
    console.error('❌ Lỗi không xác định khi chạy import:', err);
    process.exit(1);
});
