import 'dotenv/config';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Course from './database/models/Course';
import Flashcard from './database/models/Flashcard';
import CardReview from './database/models/CardReview';

const API_BASE = 'http://localhost:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Helper tạo token giả cho script test
const generateToken = (id: string, role: string) => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });
};

const userToken = generateToken('testuser123', 'user');
const creatorToken = generateToken('testcreator456', 'content_creator');

const headers = (token: string) => ({
    'Content-Type': 'application/json',
    'Cookie': `token=${token}`
});

async function runTests() {
    console.log("=== BẮT ĐẦU TEST SCRIPT (API & SRS) ===");
    
    // Kết nối trực tiếp DB (bỏ qua middleware HTTP) để kiểm chứng độc lập
    if (!process.env.MONGODB_URI) {
        console.error("LỖI: Chưa cấu hình MONGODB_URI trong .env");
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Đã kết nối MongoDB để đối chiếu dữ liệu.");

    // Dọn dẹp dữ liệu rác từ các bài test cũ
    await Course.deleteMany({ creatorId: 'testcreator456' });
    await Flashcard.deleteMany({ front: 'Test Word Front' });
    await CardReview.deleteMany({ userId: 'testuser123' });

    let testCourseId = '';
    let testCardId = '';

    // ==========================================
    // 1. KIỂM TRA BẢO MẬT ROLE (RBAC)
    // ==========================================
    console.log("\n--- TEST 1: Bảo mật phân quyền Role (RBAC) ---");
    
    // 1a. User thường cố tạo Course
    const resUser = await fetch(`${API_BASE}/creator/courses`, {
        method: 'POST',
        headers: headers(userToken),
        body: JSON.stringify({ title: 'Hacked Course' })
    });
    console.log(`[User] Cố tình gọi API tạo Course -> Status: ${resUser.status} (Kỳ vọng: 403)`);
    if (resUser.status !== 403) throw new Error("RBAC FAILED: Lỗ hổng! User thường có thể gọi API Creator!");
    console.log("=> PASS: Đã chặn thành công User thường.");

    // 1b. Creator tạo Course
    const resCreator = await fetch(`${API_BASE}/creator/courses`, {
        method: 'POST',
        headers: headers(creatorToken),
        body: JSON.stringify({ title: 'Test E2E Course', description: 'Test', isPublished: true })
    });
    console.log(`[Creator] Gọi API tạo Course -> Status: ${resCreator.status} (Kỳ vọng: 201 hoặc 200)`);
    if (!resCreator.ok) {
        console.error(await resCreator.text());
        throw new Error("RBAC FAILED: Creator không thể tạo Course!");
    }
    
    const courseData = await resCreator.json();
    testCourseId = courseData.data._id;
    console.log(`=> PASS: Tạo thành công Course với ID: ${testCourseId}`);

    // ==========================================
    // 2. KIỂM TRA TOÀN VẸN DỮ LIỆU (DB Relational)
    // ==========================================
    console.log("\n--- TEST 2: Toàn vẹn Dữ liệu Database ---");
    const resCard = await fetch(`${API_BASE}/creator/flashcards`, {
        method: 'POST',
        headers: headers(creatorToken),
        body: JSON.stringify({ courseId: testCourseId, front: 'Test Word Front', back: 'Test Meaning Back' })
    });
    if (!resCard.ok) {
        console.error(await resCard.text());
        throw new Error("Lỗi gọi API tạo Flashcard");
    }
    const cardData = await resCard.json();
    testCardId = cardData.data._id;
    console.log(`[Creator] Đã gọi API tạo Flashcard (ID: ${testCardId})`);

    // Đối chiếu trực tiếp với Database
    const dbCard = await Flashcard.findById(testCardId);
    if (!dbCard) throw new Error("LỖI CƠ SỞ DỮ LIỆU: API báo thành công nhưng Flashcard KHÔNG tồn tại trong DB!");
    if (dbCard.courseId.toString() !== testCourseId) throw new Error("LỖI CƠ SỞ DỮ LIỆU: Flashcard bị mất liên kết courseId!");
    console.log("=> DB Check PASS: Flashcard đã được Insert thành công vào bảng và Link chính xác tới Course!");

    // ==========================================
    // 3. KIỂM TRA THUẬT TOÁN SRS
    // ==========================================
    console.log("\n--- TEST 3: Thuật toán Spaced Repetition (SRS) ---");
    
    const qualities = [
        { label: 'Again', q: 0 },
        { label: 'Hard', q: 2 },
        { label: 'Good', q: 4 },
        { label: 'Easy', q: 5 }
    ];

    for (const q of qualities) {
        // Reset DB CardReview về chưa học để cô lập từng test case
        await CardReview.deleteOne({ userId: 'testuser123', cardId: testCardId });

        const resReview = await fetch(`${API_BASE}/srs/review`, {
            method: 'POST',
            headers: headers(userToken),
            body: JSON.stringify({ cardId: testCardId, courseId: testCourseId, quality: q.q, responseTimeMs: 1500 })
        });
        
        if (!resReview.ok) {
            console.error(await resReview.text());
            throw new Error(`API SRS bị lỗi khi chấm điểm ${q.q}`);
        }
        
        // Truy vấn DB xem kết quả tính toán có được lưu thật không
        const dbReview = await CardReview.findOne({ userId: 'testuser123', cardId: testCardId });
        console.log(`\n[Học viên bấm ${q.label} (Điểm ${q.q})] -> Kết quả lưu DB:`);
        console.log(`  - Trạng thái thẻ (Status): ${dbReview?.status}`);
        console.log(`  - Hệ số khó (Ease Factor): ${dbReview?.easeFactor.toFixed(2)}`);
        console.log(`  - Khoảng cách lặp (Interval): ${dbReview?.interval} ngày`);
        console.log(`  - Giờ ôn tiếp theo (Next Review): ${dbReview?.nextReviewDate.toLocaleString()}`);
    }

    console.log("\n================================================");
    console.log("🎉 TẤT CẢ TEST ĐỀU PASSED (100% XANH)");
    console.log("================================================\n");
    process.exit(0);
}

runTests().catch(err => {
    console.error("TEST FAILED CÓ LỖI:", err);
    process.exit(1);
});
