/**
 * Script chuẩn bị dữ liệu Demo SRS an toàn cho buổi bảo vệ đồ án LexiCore
 *
 * Cách chạy:
 *   npx tsx backend/scripts/seed-srs-demo.ts --email=demo@lexicore.site
 *   (hoặc từ thư mục backend: npx tsx scripts/seed-srs-demo.ts --email=demo@lexicore.site)
 *
 * Cam kết an toàn:
 * - Chỉ tạo hoặc làm mới đúng bộ thẻ "Demo SRS — Đường Cong Quên Lãng" và các bản ghi CardReview thuộc bộ thẻ này của đúng tài khoản được chỉ định.
 * - Tuyệt đối KHÔNG xóa bất kỳ bộ thẻ, khóa học hay dữ liệu của các tài khoản khác.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Course from '../database/models/Course';
import Flashcard from '../database/models/Flashcard';
import CardReview from '../database/models/CardReview';
import User from '../database/models/User';
import { pool } from '../config/mysql';

const DEMO_DECK_TITLE = 'Demo SRS — Đường Cong Quên Lãng';

function parseEmailArg(): string {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      return arg.replace('--email=', '').trim();
    }
  }
  const emailFlagIdx = args.indexOf('--email');
  if (emailFlagIdx !== -1 && args[emailFlagIdx + 1]) {
    return args[emailFlagIdx + 1].trim();
  }
  return '';
}

function getDayOffsetDate(offsetDays: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function resolveUserIdByEmail(email: string): Promise<{ userId: string; displayName: string }> {
  // 1. Tìm trong MySQL trước (nơi lưu bảng users chính của hệ thống Auth)
  try {
    const [rows] = await pool.execute(
      'SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );
    const mysqlUser = (rows as any[])[0];
    if (mysqlUser && mysqlUser.id) {
      return {
        userId: String(mysqlUser.id),
        displayName: mysqlUser.full_name || mysqlUser.email
      };
    }
  } catch (err) {
    console.warn('Cảnh báo truy vấn MySQL (chuyển sang tìm trên MongoDB):', (err as Error).message);
  }

  // 2. Fallback tìm trong MongoDB User collection
  const mongoUser = await User.findOne({
    email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
  }).lean();

  if (mongoUser && mongoUser._id) {
    return {
      userId: String(mongoUser._id),
      displayName: mongoUser.username || mongoUser.email
    };
  }

  throw new Error(`Không tìm thấy tài khoản nào khớp với email: "${email}" trên cả MySQL và MongoDB.`);
}

async function seedSrsDemo() {
  const email = parseEmailArg();
  if (!email) {
    console.error('Vui lòng truyền tham số --email=<email_tai_khoan>.');
    console.error('Ví dụ: npx tsx backend/scripts/seed-srs-demo.ts --email=demo@lexicore.site');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/LexiCoreDB';
  await mongoose.connect(mongoUri);
  console.log('[1/4] Đã kết nối MongoDB.');

  try {
    const { userId, displayName } = await resolveUserIdByEmail(email);
    console.log(`[2/4] Đã xác định tài khoản: ${displayName} (userId: ${userId})`);

    // Tìm hoặc tạo mới bộ thẻ Demo SRS
    let demoCourse = await Course.findOne({
      title: DEMO_DECK_TITLE,
      type: 'flashcard'
    });

    if (!demoCourse) {
      demoCourse = new Course({
        title: DEMO_DECK_TITLE,
        shortDescription: 'Bộ thẻ chuẩn hóa phục vụ trình diễn thuật toán Spaced Repetition SM-2 Plus & Đường cong Ebbinghaus.',
        description:
          'Bộ thẻ gồm 10 từ vựng học thuật C1-C2 được thiết kế sẵn lịch sử ôn tập (reviewHistory) qua nhiều chu kỳ để trực quan hóa Đồ thị răng cưa Sawtooth, dự báo chu kỳ 4 nút chấm điểm và bảng Review Forecast 7 ngày.',
        level: 'C1',
        type: 'flashcard',
        tags: ['SRS Demo', 'Ebbinghaus', 'SM-2 Plus', 'Academic'],
        isPublished: true,
        creatorId: userId,
        viewsCount: 42
      });
      await demoCourse.save();
      console.log(`[3/4] Đã tạo mới bộ thẻ: "${DEMO_DECK_TITLE}" (_id: ${demoCourse._id})`);
    } else {
      demoCourse.isPublished = true;
      await demoCourse.save();
      console.log(`[3/4] Sử dụng bộ thẻ hiện có: "${DEMO_DECK_TITLE}" (_id: ${demoCourse._id})`);
    }

    const courseId = demoCourse._id as mongoose.Types.ObjectId;

    // Chỉ xóa Flashcard cũ trong đúng bộ thẻ Demo này và CardReview của đúng userId trên bộ thẻ Demo này
    await Flashcard.deleteMany({ courseId });
    await CardReview.deleteMany({ userId, courseId });

    const now = new Date();
    const dueTodayTime = new Date(now.getTime() - 30 * 60 * 1000); // Đã đến hạn hôm nay (trước 30 phút)

    // Định nghĩa 10 thẻ từ vựng chuẩn học thuật kèm kịch bản SRS
    const demoCardsSpec = [
      // 1. Thẻ Review đến hạn hôm nay (#1) - Có sẵn 3 lần ôn trong quá khứ để vẽ Sawtooth Curve & sẵn sàng bấm Nhớ/Dễ
      {
        order: 1,
        front: 'Ubiquitous',
        back: 'Có mặt ở khắp mọi nơi, phổ biến rộng khắp',
        partOfSpeech: 'adjective',
        phonetic: '/juːˈbɪk.wɪ.təs/',
        example: 'Smartphones have become ubiquitous in modern daily life.',
        exampleMeaning: 'Điện thoại thông minh đã trở nên phổ biến ở khắp mọi nơi trong cuộc sống hiện đại.',
        synonyms: ['omnipresent', 'pervasive', 'universal'],
        note: 'Gốc Latin "ubique" (mọi nơi). Thẻ dùng để demo bấm Nhớ (6d -> 15d) hoặc Dễ (6d -> 20d) và xem đồ thị Răng cưa Tab 2.',
        srs: {
          easeFactor: 2.50,
          interval: 6,
          repetitions: 2,
          status: 'Review' as const,
          nextReviewDate: dueTodayTime,
          reviewHistory: [
            { date: getDayOffsetDate(-10, 9, 15), quality: 4, interval: 1, easeFactor: 2.50, responseTimeMs: 4200 },
            { date: getDayOffsetDate(-9, 14, 20), quality: 4, interval: 3, easeFactor: 2.50, responseTimeMs: 3600 },
            { date: getDayOffsetDate(-6, 16, 10), quality: 4, interval: 6, easeFactor: 2.50, responseTimeMs: 3100 }
          ]
        }
      },
      // 2. Thẻ Review đến hạn hôm nay (#2) - Dùng để demo bấm SAI (Again) cho hội đồng thấy Interval 6d -> 0d & quay về cuối hàng đợi
      {
        order: 2,
        front: 'Pragmatic',
        back: 'Thực tế, thực dụng (ưu tiên hiệu quả thực tiễn hơn lý thuyết suông)',
        partOfSpeech: 'adjective',
        phonetic: '/præɡˈmæt.ɪk/',
        example: 'We need to adopt a pragmatic approach to software architecture.',
        exampleMeaning: 'Chúng ta cần áp dụng một cách tiếp cận thực tế đối với kiến trúc phần mềm.',
        synonyms: ['practical', 'realistic', 'sensible'],
        note: 'Thẻ dùng để demo bấm nút Sai (1): Interval 6d -> 0d, EF 2.50 -> 2.36, Status: Learning và tự động đẩy xuống cuối phiên học.',
        srs: {
          easeFactor: 2.50,
          interval: 6,
          repetitions: 2,
          status: 'Review' as const,
          nextReviewDate: dueTodayTime,
          reviewHistory: [
            { date: getDayOffsetDate(-8, 10, 0), quality: 4, interval: 2, easeFactor: 2.50, responseTimeMs: 4800 },
            { date: getDayOffsetDate(-6, 15, 30), quality: 4, interval: 6, easeFactor: 2.50, responseTimeMs: 3900 }
          ]
        }
      },
      // 3. Thẻ New đến hạn hôm nay (#3) - interval = 0, repetitions = 0, EF = 2.50
      {
        order: 3,
        front: 'Serendipity',
        back: 'Sự tình cờ may mắn (khám phá ra điều quý giá ngoài dự kiến)',
        partOfSpeech: 'noun',
        phonetic: '/ˌser.ənˈdɪp.ə.ti/',
        example: 'Finding that rare algorithm paper was pure serendipity.',
        exampleMeaning: 'Tìm thấy bài báo thuật toán hiếm đó hoàn toàn là một sự tình cờ may mắn.',
        synonyms: ['chance', 'fortuity', 'happy accident'],
        note: 'Thẻ ở trạng thái New (Rep=0, Interval=0d, EF=2.50) để trình diễn 4 mức dự báo ban đầu (0d / 1d / 3d / 7d).',
        srs: {
          easeFactor: 2.50,
          interval: 0,
          repetitions: 0,
          status: 'New' as const,
          nextReviewDate: dueTodayTime,
          reviewHistory: []
        }
      },
      // 4. Thẻ Learning đến hạn hôm nay (#4) - Tổng cộng vừa đủ 4 cards due today trong bộ Demo
      {
        order: 4,
        front: 'Resilient',
        back: 'Kiên cường, có khả năng phục hồi nhanh sau nghịch cảnh hoặc sự cố',
        partOfSpeech: 'adjective',
        phonetic: '/rɪˈzɪl.i.ənt/',
        example: 'A distributed system must be resilient to network failures.',
        exampleMeaning: 'Một hệ thống phân tán phải có khả năng phục hồi nhanh trước các sự cố mạng.',
        synonyms: ['robust', 'tough', 'adaptable'],
        note: 'Thẻ ở trạng thái Learning (Rep=1, Interval=1d, EF=2.40) sau lần ôn ngày hôm qua.',
        srs: {
          easeFactor: 2.40,
          interval: 1,
          repetitions: 1,
          status: 'Learning' as const,
          nextReviewDate: dueTodayTime,
          reviewHistory: [
            { date: getDayOffsetDate(-1, 19, 0), quality: 2, interval: 1, easeFactor: 2.40, responseTimeMs: 5200 }
          ]
        }
      },
      // 5. Thẻ đến hạn NGÀY MAI (+1 ngày) - Có 3 lần ôn
      {
        order: 5,
        front: 'Ephemeral',
        back: 'Phù du, ngắn ngủi, chỉ tồn tại trong thời gian rất ngắn',
        partOfSpeech: 'adjective',
        phonetic: '/ɪˈfem.ər.əl/',
        example: 'Viral social media trends are often ephemeral.',
        exampleMeaning: 'Các xu hướng lan truyền trên mạng xã hội thường chỉ tồn tại ngắn ngủi.',
        synonyms: ['fleeting', 'transient', 'short-lived'],
        note: 'Điểm rơi ôn tập vào Ngày mai (+1d).',
        srs: {
          easeFactor: 2.50,
          interval: 6,
          repetitions: 2,
          status: 'Review' as const,
          nextReviewDate: getDayOffsetDate(1, 12, 0),
          reviewHistory: [
            { date: getDayOffsetDate(-11, 9, 0), quality: 4, interval: 1, easeFactor: 2.50, responseTimeMs: 4100 },
            { date: getDayOffsetDate(-9, 11, 0), quality: 4, interval: 4, easeFactor: 2.50, responseTimeMs: 3500 },
            { date: getDayOffsetDate(-5, 17, 0), quality: 4, interval: 6, easeFactor: 2.50, responseTimeMs: 2900 }
          ]
        }
      },
      // 6. Thẻ đến hạn NGÀY MAI (+1 ngày) - Có 3 lần ôn
      {
        order: 6,
        front: 'Eloquent',
        back: 'Hùng hồn, có tài hùng biện và diễn đạt thuyết phục',
        partOfSpeech: 'adjective',
        phonetic: '/ˈel.ə.kwənt/',
        example: 'She delivered an eloquent defense of her graduation thesis.',
        exampleMeaning: 'Cô ấy đã trình bày một màn bảo vệ khóa luận tốt nghiệp đầy thuyết phục.',
        synonyms: ['articulate', 'persuasive', 'expressive'],
        note: 'Điểm rơi ôn tập vào Ngày mai (+1d).',
        srs: {
          easeFactor: 2.60,
          interval: 15,
          repetitions: 3,
          status: 'Review' as const,
          nextReviewDate: getDayOffsetDate(1, 15, 0),
          reviewHistory: [
            { date: getDayOffsetDate(-21, 10, 0), quality: 4, interval: 1, easeFactor: 2.50, responseTimeMs: 4000 },
            { date: getDayOffsetDate(-20, 10, 0), quality: 4, interval: 6, easeFactor: 2.50, responseTimeMs: 3200 },
            { date: getDayOffsetDate(-14, 16, 0), quality: 5, interval: 15, easeFactor: 2.60, responseTimeMs: 2500 }
          ]
        }
      },
      // 7. Thẻ đến hạn +2 NGÀY - Có 3 lần ôn
      {
        order: 7,
        front: 'Meticulous',
        back: 'Tỉ mỉ, kỹ lưỡng, chú ý đến từng chi tiết nhỏ nhất',
        partOfSpeech: 'adjective',
        phonetic: '/məˈtɪk.jə.ləs/',
        example: 'Scientific data analysis requires meticulous attention to detail.',
        exampleMeaning: 'Phân tích dữ liệu khoa học đòi hỏi sự tỉ mỉ đến từng chi tiết.',
        synonyms: ['thorough', 'scrupulous', 'precise'],
        note: 'Điểm rơi ôn tập vào +2 ngày.',
        srs: {
          easeFactor: 2.50,
          interval: 15,
          repetitions: 3,
          status: 'Review' as const,
          nextReviewDate: getDayOffsetDate(2, 12, 0),
          reviewHistory: [
            { date: getDayOffsetDate(-20, 9, 30), quality: 4, interval: 1, easeFactor: 2.50, responseTimeMs: 4300 },
            { date: getDayOffsetDate(-19, 14, 0), quality: 4, interval: 6, easeFactor: 2.50, responseTimeMs: 3400 },
            { date: getDayOffsetDate(-13, 18, 0), quality: 4, interval: 15, easeFactor: 2.50, responseTimeMs: 2800 }
          ]
        }
      },
      // 8. Thẻ đến hạn +3 NGÀY - Có 4 lần ôn (Sawtooth Curve 4 răng cưa cực đẹp)
      {
        order: 8,
        front: 'Paradigm',
        back: 'Mô hình, hệ hình tư duy hoặc khuôn mẫu lý thuyết điển hình',
        partOfSpeech: 'noun',
        phonetic: '/ˈpær.ə.daɪm/',
        example: 'Active recall represents a paradigm shift in vocabulary acquisition.',
        exampleMeaning: 'Chủ động gợi nhớ đại diện cho một bước chuyển dịch mô hình trong việc tiếp thu từ vựng.',
        synonyms: ['model', 'framework', 'archetype'],
        note: 'Thẻ có 4 lần ôn tập qua nhiều tuần, vẽ đồ thị Sawtooth 4 chu kỳ rất rõ nét.',
        srs: {
          easeFactor: 2.60,
          interval: 16,
          repetitions: 4,
          status: 'Review' as const,
          nextReviewDate: getDayOffsetDate(3, 12, 0),
          reviewHistory: [
            { date: getDayOffsetDate(-23, 8, 30), quality: 4, interval: 1, easeFactor: 2.50, responseTimeMs: 4600 },
            { date: getDayOffsetDate(-22, 11, 0), quality: 4, interval: 3, easeFactor: 2.50, responseTimeMs: 3800 },
            { date: getDayOffsetDate(-19, 15, 0), quality: 4, interval: 6, easeFactor: 2.50, responseTimeMs: 3100 },
            { date: getDayOffsetDate(-3, 20, 0), quality: 5, interval: 16, easeFactor: 2.60, responseTimeMs: 2400 }
          ]
        }
      },
      // 9. Thẻ đến hạn +3 NGÀY - Có 2 lần ôn
      {
        order: 9,
        front: 'Alleviate',
        back: 'Làm giảm bớt, xoa dịu (nỗi đau, gánh nặng hoặc vấn đề khó khăn)',
        partOfSpeech: 'verb',
        phonetic: '/əˈliː.vi.eɪt/',
        example: 'Spaced repetition helps alleviate the cognitive load of cramming.',
        exampleMeaning: 'Lặp lại ngắt quãng giúp giảm bớt gánh nặng nhận thức của việc học nhồi nhét.',
        synonyms: ['mitigate', 'relieve', 'ease'],
        note: 'Điểm rơi ôn tập vào +3 ngày.',
        srs: {
          easeFactor: 2.50,
          interval: 6,
          repetitions: 2,
          status: 'Review' as const,
          nextReviewDate: getDayOffsetDate(3, 16, 0),
          reviewHistory: [
            { date: getDayOffsetDate(-5, 10, 0), quality: 4, interval: 2, easeFactor: 2.50, responseTimeMs: 3900 },
            { date: getDayOffsetDate(-3, 18, 30), quality: 4, interval: 6, easeFactor: 2.50, responseTimeMs: 3000 }
          ]
        }
      },
      // 10. Thẻ đến hạn +5 NGÀY - Có 4 lần ôn (Sawtooth Curve 4 răng cưa)
      {
        order: 10,
        front: 'Quintessential',
        back: 'Tinh túy nhất, đại diện hoàn hảo và điển hình nhất cho một phẩm chất',
        partOfSpeech: 'adjective',
        phonetic: '/ˌkwɪn.tɪˈsen.ʃəl/',
        example: 'Ebbinghaus is the quintessential pioneer of memory retention research.',
        exampleMeaning: 'Ebbinghaus là nhà tiên phong tiêu biểu nhất trong nghiên cứu về duy trì trí nhớ.',
        synonyms: ['classic', 'archetypal', 'definitive'],
        note: 'Điểm rơi ôn tập vào +5 ngày, có 4 mốc lịch sử ôn tập.',
        srs: {
          easeFactor: 2.70,
          interval: 20,
          repetitions: 4,
          status: 'Review' as const,
          nextReviewDate: getDayOffsetDate(5, 12, 0),
          reviewHistory: [
            { date: getDayOffsetDate(-26, 9, 0), quality: 4, interval: 1, easeFactor: 2.50, responseTimeMs: 4900 },
            { date: getDayOffsetDate(-25, 12, 0), quality: 4, interval: 3, easeFactor: 2.50, responseTimeMs: 3700 },
            { date: getDayOffsetDate(-22, 16, 0), quality: 5, interval: 7, easeFactor: 2.60, responseTimeMs: 2800 },
            { date: getDayOffsetDate(-1, 21, 0), quality: 5, interval: 20, easeFactor: 2.70, responseTimeMs: 2200 }
          ]
        }
      }
    ];

    for (const item of demoCardsSpec) {
      const createdCard = new Flashcard({
        courseId,
        front: item.front,
        back: item.back,
        partOfSpeech: item.partOfSpeech as any,
        phonetic: item.phonetic,
        example: item.example,
        exampleMeaning: item.exampleMeaning,
        synonyms: item.synonyms,
        note: item.note,
        order: item.order
      });
      await createdCard.save();

      const createdReview = new CardReview({
        userId,
        cardId: createdCard._id,
        courseId,
        easeFactor: item.srs.easeFactor,
        interval: item.srs.interval,
        repetitions: item.srs.repetitions,
        status: item.srs.status,
        nextReviewDate: item.srs.nextReviewDate,
        reviewHistory: item.srs.reviewHistory
      });
      await createdReview.save();
    }

    console.log(`[4/4] Đã khởi tạo thành công 10 thẻ Flashcard & CardReview cho bộ "${DEMO_DECK_TITLE}":`);
    console.log('  - Hôm nay (Due Today): 4 thẻ (Ubiquitous [Review], Pragmatic [Review], Serendipity [New], Resilient [Learning])');
    console.log('  - Ngày mai (+1 ngày):  2 thẻ (Ephemeral, Eloquent)');
    console.log('  - +2 ngày:             1 thẻ (Meticulous)');
    console.log('  - +3 ngày:             2 thẻ (Paradigm, Alleviate)');
    console.log('  - +5 ngày:             1 thẻ (Quintessential)');
    console.log('Hoàn tất chuẩn bị dữ liệu Demo SRS an toàn.');
  } finally {
    await mongoose.disconnect();
    try {
      await pool.end();
    } catch {
      // ignore
    }
  }
}

seedSrsDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Lỗi khi chạy seed-srs-demo:', err);
    process.exit(1);
  });
