export const calculateSM2Plus = (
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number,
  previousReviewDate: Date | null,
  currentStatus: 'New' | 'Learning' | 'Review' | 'Relearning'
) => {
  // 1. Tính toán Hệ số dễ (Ease Factor) mới theo từng mức đánh giá (0: Sai, 2: Khó, 4: Nhớ, 5: Dễ)
  let efDelta = 0;
  if (quality >= 5) {
    efDelta = 0.10; // Dễ: tăng EF +0.10
  } else if (quality >= 4) {
    efDelta = 0.00; // Nhớ: giữ nguyên EF
  } else if (quality >= 2) {
    efDelta = -0.10; // Khó: giảm nhẹ EF -0.10
  } else {
    efDelta = -0.14; // Sai: giảm EF -0.14 (ví dụ 2.50 -> 2.36)
  }

  let newEaseFactor = Math.round((easeFactor + efDelta) * 100) / 100;
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  let newInterval = 0;
  let newRepetitions = repetitions;
  let newStatus: 'New' | 'Learning' | 'Review' | 'Relearning' = currentStatus;

  // Tính số ngày trễ hạn thực tế (Overdue days) nếu thẻ đã học trước đó
  let delayDays = 0;
  const now = new Date();
  if (previousReviewDate && interval > 0) {
    const expectedReviewDate = new Date(previousReviewDate.getTime() + interval * 24 * 60 * 60 * 1000);
    delayDays = Math.max(0, Math.floor((now.getTime() - expectedReviewDate.getTime()) / (24 * 60 * 60 * 1000)));
  }

  // 2. Phân tách rõ 4 mức khoảng cách ngày ôn tập (Sai < Khó < Nhớ < Dễ)
  if (quality < 2) {
    // Mức 1: Sai (Again - quality = 0) -> Reset chu kỳ về 0 ngày để học lại ngay trong phiên
    newRepetitions = 0;
    newInterval = 0;
    newStatus = 'Learning';
  } else if (quality < 4) {
    // Mức 2: Khó (Hard - quality = 2 hoặc 3) -> Chu kỳ ngắn, không bị trùng với Sai (0 ngày)
    if (interval <= 0 || repetitions === 0) {
      newInterval = 1;
      newRepetitions = 1;
      newStatus = 'Learning';
    } else if (interval === 1) {
      newInterval = 2;
      newRepetitions = Math.max(1, repetitions);
      newStatus = 'Review';
    } else {
      newInterval = Math.max(interval + 1, Math.round(interval * 1.2));
      newRepetitions = Math.max(1, repetitions);
      newStatus = 'Review';
    }
  } else if (quality === 4) {
    // Mức 3: Nhớ (Good - quality = 4) -> Tăng chuẩn SM-2 Plus
    newRepetitions = repetitions + 1;
    newStatus = 'Review';
    if (newRepetitions === 1) {
      newInterval = interval >= 1 ? Math.max(2, Math.round(interval * 1.5)) : 3;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      const effectiveInterval = interval > 0 ? interval + delayDays / 2 : 6;
      newInterval = Math.max(interval + 1, Math.round(effectiveInterval * newEaseFactor));
    }
  } else {
    // Mức 4: Dễ (Easy - quality = 5) -> Tăng mạnh kèm Overdue Bonus + Easy Bonus (1.3x)
    newRepetitions = repetitions + 1;
    newStatus = 'Review';
    if (newRepetitions === 1) {
      newInterval = interval >= 1 ? Math.max(4, Math.round(interval * 2.5)) : 7;
    } else if (newRepetitions === 2) {
      newInterval = 15;
    } else {
      const effectiveInterval = interval > 0 ? interval + delayDays : 6;
      const goodInterval = Math.max(interval + 1, Math.round((interval > 0 ? interval + delayDays / 2 : 6) * easeFactor));
      newInterval = Math.max(goodInterval + 2, Math.round(effectiveInterval * newEaseFactor * 1.3));
    }
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
