import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './database/models/Course';
import Chapter from './database/models/Chapter';
import Lesson from './database/models/Lesson';
import { syncCourseTreeService } from './modules/course/course.service';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lexicore';

async function seedShowcase() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const creatorId = 'eb619a0c-c86d-4b55-a12d-dee88ec98b18'; // Sergio Ramos

  // Remove previous showcase if exists
  await Course.deleteMany({ title: 'Tiếng Anh Kỹ Thuật Cho Kỹ Sư Phần Mềm (Pro)', creatorId });

  const course = new Course({
    title: 'Tiếng Anh Kỹ Thuật Cho Kỹ Sư Phần Mềm (Pro)',
    shortDescription: 'Làm chủ giao tiếp kỹ thuật, viết tài liệu và phỏng vấn công nghệ cao cấp.',
    description: 'Khóa học toàn diện gồm video thực chiến, lý thuyết chuẩn quốc tế, từ vựng chuyên ngành công nghệ và bài kiểm tra phản xạ nhanh.',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop',
    level: 'B2',
    tags: ['software', 'agile', 'interview', 'speaking'],
    objectives: [
      'Tự tin báo cáo tiến độ và giải thích các vấn đề kỹ thuật trong Daily Standup',
      'Viết Pull Request Description và Architecture Decision Record (ADR) chuyên nghiệp',
      'Nắm vững 200+ thuật ngữ chuyên ngành công nghệ thông tin và đám mây'
    ],
    price: 0,
    status: 'draft',
    isPublished: false,
    creatorId
  });
  await course.save();

  const treePayload = {
    course: {
      id: course._id.toString(),
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      thumbnail: course.thumbnail,
      level: course.level,
      tags: course.tags,
      objectives: course.objectives,
      status: 'draft',
      isPublished: false
    },
    chapters: [
      {
        id: 'tmp_ch_1',
        title: 'Chương 1: Kỹ Năng Giao Tiếp Scrum & Agile Toàn Cầu',
        description: 'Làm quen với các mẫu câu báo cáo sprint và phối hợp team đa quốc gia.',
        summary: 'Chúc mừng bạn đã hoàn thành Chương 1! Bạn đã nắm vững mô hình báo cáo 3 phần (Hôm qua - Hôm nay - Blockers) và phản xạ trả lời tự nhiên.',
        keyTakeaways: [
          'Dùng thì Hiện tại hoàn thành (Present Perfect) cho việc vừa hoàn thành',
          'Trình bày blocker kèm nguyên nhân gốc rễ và giải pháp đề xuất',
          'Sử dụng thuật ngữ kỹ thuật chuẩn xác thay vì dịch thô từ tiếng Việt'
        ],
        order: 1,
        lessons: [
          {
            id: 'tmp_ls_1',
            title: 'Bài 1: Phân tích Video Daily Standup thực tế tại Thung Lũng Silicon',
            type: 'video',
            durationMinutes: 12,
            order: 1,
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            notes: 'Mẹo quan trọng: Giữ câu nói dưới 45 giây và chủ động đề xuất giải pháp khi gặp blocker.'
          },
          {
            id: 'tmp_ls_2',
            title: 'Bài 2: Hướng dẫn cấu trúc ngữ pháp báo cáo tiến độ Sprint',
            type: 'reading',
            durationMinutes: 8,
            order: 2,
            content: '## 1. Công thức báo cáo công việc hàng ngày\n\n- **Yesterday:** "I completed the API endpoint optimization."\n- **Today:** "I am focusing on the unit test coverage for the payment gateway."\n- **Blockers:** "I am currently blocked by third-party webhook latency."',
            blocks: []
          },
          {
            id: 'tmp_ls_3',
            title: 'Bài 3: Từ vựng cốt lõi trong quy trình Phát triển Phần mềm',
            type: 'vocabulary',
            durationMinutes: 15,
            order: 3,
            vocabulary: [
              {
                id: 'voc_1',
                term: 'blocker',
                phonetic: '/ˈblɒk.ər/',
                partOfSpeech: 'noun',
                meaning: 'vấn đề cản trở tiến độ công việc',
                example: 'I have a critical blocker with the database connection pool.'
              },
              {
                id: 'voc_2',
                term: 'refactor',
                phonetic: '/riːˈfæk.tər/',
                partOfSpeech: 'verb',
                meaning: 'tái cấu trúc mã nguồn mà không thay đổi tính năng bên ngoài',
                example: 'We decided to refactor the authentication middleware.'
              },
              {
                id: 'voc_3',
                term: 'latency',
                phonetic: '/ˈleɪ.tən.si/',
                partOfSpeech: 'noun',
                meaning: 'độ trễ truyền tải dữ liệu qua mạng',
                example: 'The new caching layer reduced API latency by 60%.'
              },
              {
                id: 'voc_4',
                term: 'scalable',
                phonetic: '/ˈskeɪ.lə.bəl/',
                partOfSpeech: 'adjective',
                meaning: 'có khả năng mở rộng quy mô khi lượng người dùng tăng',
                example: 'Our microservice architecture is highly scalable.'
              }
            ]
          },
          {
            id: 'tmp_ls_4',
            title: 'Bài 4: Mini Quiz củng cố phản xạ giao tiếp Scrum',
            type: 'quiz',
            durationMinutes: 10,
            order: 4,
            quiz: [
              {
                id: 'q_1',
                question: 'Khi gặp sự cố chặn tiến độ trong buổi Standup, câu nào là phù hợp và chuyên nghiệp nhất?',
                options: [
                  'I am stuck, someone please fix it.',
                  'I am currently blocked by an API latency issue on the auth server.',
                  'The project is delayed because backend team failed.',
                  'I did nothing because server was down.'
                ],
                correctIndex: 1,
                explanation: 'Phương án B nêu rõ ràng tình trạng (blocked), nguyên nhân cụ thể (API latency) và vị trí xảy ra (auth server).'
              },
              {
                id: 'q_2',
                question: 'Thuật ngữ nào mang nghĩa "tái cấu trúc code để nâng cao chất lượng mà không làm hỏng logic"?',
                options: [
                  'Overhaul',
                  'Refactor',
                  'Deprecate',
                  'Rollback'
                ],
                correctIndex: 1,
                explanation: 'Refactoring là thuật ngữ chuẩn để chỉ việc cải thiện cấu trúc mã nguồn mà hành vi người dùng không đổi.'
              }
            ]
          }
        ]
      },
      {
        id: 'tmp_ch_2',
        title: 'Chương 2: Viết Pull Request & Tài Liệu Kỹ Thuật (RFC / ADR)',
        description: 'Học cách diễn đạt giải pháp kiến trúc và thuyết phục đồng nghiệp trong code review.',
        summary: 'Bạn đã làm chủ kỹ năng giao tiếp bất đồng bộ qua văn bản (asynchronous communication) với đồng nghiệp quốc tế.',
        keyTakeaways: [
          'Template chuẩn cho Pull Request: Context, Changes, Testing, Rollback Plan',
          'Sử dụng giọng văn trung tính và xây dựng khi review code'
        ],
        order: 2,
        lessons: [
          {
            id: 'tmp_ls_pr',
            title: 'Bài 1: Mẫu Pull Request chuẩn công nghiệp quốc tế',
            type: 'reading',
            durationMinutes: 10,
            order: 1,
            content: 'Hướng dẫn viết PR template cho team đa quốc gia.\n\n### Cấu trúc tiêu chuẩn:\n- **What**: Mô tả tính năng hoặc bug fix.\n- **Why**: Lý do cần thay đổi này.\n- **How to test**: Hướng dẫn các bước kiểm thử.'
          }
        ]
      }
    ]
  };

  const res = await syncCourseTreeService(course._id.toString(), creatorId, treePayload as any);
  console.log('✅ Showcase course seeded successfully! Course ID:', course._id.toString());
  console.log('   Stats:', res.course.stats);
  await mongoose.disconnect();
}

seedShowcase().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
