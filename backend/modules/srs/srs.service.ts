export const calculateSM2Plus = (
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number,
  previousReviewDate: Date | null,
  currentStatus: 'New' | 'Learning' | 'Review' | 'Relearning'
) => {
  // 1. Tính toán Hệ số dễ (Ease Factor) mới
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // EF không bao giờ được nhỏ hơn 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  let newInterval = 0;
  let newRepetitions = repetitions;
  let newStatus: 'New' | 'Learning' | 'Review' | 'Relearning' = currentStatus;

  // Tính số ngày trễ (Overdue days) nếu thẻ đã học trước đó
  let delayDays = 0;
  const now = new Date();
  if (previousReviewDate && interval > 0) {
    const expectedReviewDate = new Date(previousReviewDate.getTime() + interval * 24 * 60 * 60 * 1000);
    delayDays = Math.max(0, Math.floor((now.getTime() - expectedReviewDate.getTime()) / (24 * 60 * 60 * 1000)));
  }

  // 2. Xử lý khoảng lặp dựa trên chất lượng trả lời
  if (quality < 3) {
    // Trả lời Sai (Again / Hard) -> Đặt lại tiến độ
    newRepetitions = 0;
    newInterval = 1; 
    newStatus = (currentStatus === 'New' || currentStatus === 'Learning') ? 'Learning' : 'Relearning';
  } else {
    // Trả lời Đúng (Good / Easy)
    if (repetitions === 0) {
      newInterval = 1;
      newStatus = 'Learning';
    } else if (repetitions === 1) {
      newInterval = 6;
      newStatus = 'Review';
    } else {
      // Tính interval kèm Overdue Bonus
      // Nếu user nhớ bài dù bị trễ (quality >= 3), thưởng một phần delayDays vào interval cũ
      const effectiveInterval = interval + (quality === 5 ? delayDays : delayDays / 2);
      newInterval = Math.round(effectiveInterval * newEaseFactor);
      newStatus = 'Review';
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
    nextReviewDate,
    status: newStatus
  };
};
