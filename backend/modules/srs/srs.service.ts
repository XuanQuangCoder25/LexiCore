export const calculateSM2 = (
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number
) => {
  // 1. Tính toán Hệ số dễ (Ease Factor) mới
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // EF không bao giờ được nhỏ hơn 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  let newInterval = 0;
  let newRepetitions = repetitions;

  // 2. Xử lý khoảng lặp dựa trên chất lượng trả lời
  if (quality < 3) {
    // Trả lời Sai (Again / Hard) -> Đặt lại tiến độ, bắt buộc ôn lại vào ngày hôm sau
    newRepetitions = 0;
    newInterval = 1; 
  } else {
    // Trả lời Đúng (Good / Easy)
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      // Tính ngày ôn tập tiếp theo dựa trên hệ số EF và làm tròn
      newInterval = Math.round(interval * newEaseFactor);
    }
    newRepetitions++;
  }

  // 3. Tính toán Ngày ôn tập tiếp theo (Next Review Date)
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate
  };
};
