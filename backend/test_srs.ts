import { calculateSM2Plus } from './modules/srs/srs.service';

const runTests = () => {
  console.log("=== BẮT ĐẦU TEST THUẬT TOÁN SM-2+ ===\n");

  // Mock Date
  const today = new Date();
  const past14Days = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const past6Months = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);

  // 1. Test Case 1: Thẻ trễ hạn dài ngày (Overdue Card)
  console.log("TEST CASE 1: Thẻ trễ hạn (Overdue) - Nhớ bài tốt");
  console.log("Đầu vào: Interval 10 ngày, trễ 4 ngày so với nextReviewDate. Trả lời Good (4).");
  const result1 = calculateSM2Plus(
    4, // quality = 4
    3, // repetitions = 3
    2.5, // easeFactor = 2.5
    10, // interval cũ = 10
    past14Days, // Học lần cuối 14 ngày trước (Lẽ ra phải ôn vào ngày thứ 10, vậy trễ 4 ngày)
    'Review'
  );
  console.log("Kết quả mong đợi: Interval phải > 25 (10 * 2.5). Có thưởng thêm Overdue Bonus.");
  console.log("Thực tế:", { interval: result1.interval, easeFactor: result1.easeFactor, status: result1.status });
  console.log(result1.interval > 25 ? "✅ PASS" : "❌ FAIL");
  console.log("------------------------------------------");


  // 2. Test Case 2: Rớt khỏi ngưỡng thuộc (Forgetting a well-learned card)
  console.log("TEST CASE 2: Quên bài đã học rất kỹ (Relearning)");
  console.log("Đầu vào: Đã thuộc (interval 180 ngày), nhưng bấm Again (0) vì quên.");
  const result2 = calculateSM2Plus(
    0, // quality = 0
    10, // repetitions = 10
    2.6, // easeFactor
    180, // interval 180 ngày
    past6Months,
    'Review'
  );
  console.log("Kết quả mong đợi: Interval rớt về 1, Repetition về 0, Status -> Relearning, EF giảm nhưng >= 1.3");
  console.log("Thực tế:", { interval: result2.interval, rep: result2.repetitions, easeFactor: result2.easeFactor, status: result2.status });
  console.log(result2.interval === 1 && result2.status === 'Relearning' && result2.easeFactor >= 1.3 ? "✅ PASS" : "❌ FAIL");
  console.log("------------------------------------------");


  // 3. Test Case 3: Thẻ mới tinh liên tục trả lời sai (Stuck on New Card)
  console.log("TEST CASE 3: Thẻ mới (New) liên tục trả lời sai");
  let newCardState = { quality: 0, rep: 0, ef: 2.5, int: 0, prevDate: null, status: 'New' as any };
  let passed = true;
  for (let i = 1; i <= 5; i++) {
    const res = calculateSM2Plus(newCardState.quality, newCardState.rep, newCardState.ef, newCardState.int, newCardState.prevDate, newCardState.status);
    newCardState = { quality: 0, rep: res.repetitions, ef: res.easeFactor, int: res.interval, prevDate: new Date(), status: res.status };
    if (res.interval !== 1 || res.easeFactor < 1.3) passed = false;
  }
  console.log("Đầu vào: Trả lời sai (0) liên tục 5 lần.");
  console.log("Kết quả mong đợi: Interval luôn là 1, EF giảm nhưng dừng ở mốc 1.3, Status = Learning");
  console.log("Thực tế sau 5 lần sai:", { interval: newCardState.int, easeFactor: newCardState.ef, status: newCardState.status });
  console.log(passed ? "✅ PASS" : "❌ FAIL");
  console.log("------------------------------------------");

};

runTests();
