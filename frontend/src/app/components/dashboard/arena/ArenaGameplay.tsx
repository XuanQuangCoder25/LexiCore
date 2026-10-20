import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Timer,
  X,
  Flame,
  Check,
  Flag,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  MatchedPayload,
  GameOverPayload,
  arenaSocketService,
} from '../../../services/arena-socket.service';
import { getRankBadgeUrl } from '../../../services/arena-service';

interface QuestionItem {
  id: string;
  meaning: string; // Nghĩa tiếng Việt (Đề bài)
  word: string; // Từ/Cụm từ tiếng Anh (Đáp án)
  wordType: string; // Loại từ
  topic: string; // Chủ đề
  example?: string; // Câu ví dụ gợi ý
}

// 25 Câu hỏi phong phú cho chế độ đấu trường Wordle (Việt -> Anh)
const DEFAULT_MATCH_QUESTIONS: QuestionItem[] = [
  {
    id: 'w-1',
    meaning: 'Có khả năng phục hồi nhanh chóng sau khó khăn hoặc nghịch cảnh',
    word: 'RESILIENT',
    wordType: 'Tính từ (Adj)',
    topic: 'Tâm lý & Tính cách',
    example: 'Children are often remarkably ______ to shocks and trauma.',
  },
  {
    id: 'w-2',
    meaning: 'Chỉ tồn tại trong một khoảng thời gian rất ngắn, phù du, chóng tàn',
    word: 'EPHEMERAL',
    wordType: 'Tính từ (Adj)',
    topic: 'Triết học & Cuộc sống',
    example: 'Fame in the internet age is often exceedingly ______.',
  },
  {
    id: 'w-3',
    meaning: 'Sự bảo tồn môi trường sinh thái tự nhiên',
    word: 'ENVIRONMENT CONSERVATION',
    wordType: 'Cụm danh từ (Noun Phrase)',
    topic: 'Môi trường & Sinh thái',
    example: 'The government pledged more funds for ______.',
  },
  {
    id: 'w-4',
    meaning: 'Hiện tượng ấm lên toàn cầu do hiệu ứng nhà kính',
    word: 'GLOBAL WARMING',
    wordType: 'Cụm danh từ (Noun Phrase)',
    topic: 'Môi trường & Khoa học',
    example: '______ has become the most urgent ecological crisis of our era.',
  },
  {
    id: 'w-5',
    meaning: 'Sự đổi mới, sáng tạo mang tính đột phá',
    word: 'INNOVATION',
    wordType: 'Danh từ (Noun)',
    topic: 'Công nghệ & Phát triển',
    example: 'Technological ______ is transforming traditional finance.',
  },
  {
    id: 'w-6',
    meaning: 'Có mặt ở khắp mọi nơi cùng một lúc, phổ biến ở mọi chốn',
    word: 'UBIQUITOUS',
    wordType: 'Tính từ (Adj)',
    topic: 'Xã hội hiện đại',
    example: 'Smartphones have become ______ in modern daily life.',
  },
  {
    id: 'w-7',
    meaning: 'Sự phát triển bền vững đáp ứng nhu cầu hiện tại và tương lai',
    word: 'SUSTAINABLE DEVELOPMENT',
    wordType: 'Cụm danh từ (Noun Phrase)',
    topic: 'Kinh tế & Xã hội',
    example: 'Green energy is the cornerstone of ______.',
  },
  {
    id: 'w-8',
    meaning: 'Bảo vệ, gìn giữ, ngăn ngừa khỏi sự tổn hại hoặc biến mất',
    word: 'PRESERVE',
    wordType: 'Động từ (Verb)',
    topic: 'Văn hóa & Di sản',
    example: 'We must do everything possible to ______ historic monuments.',
  },
  {
    id: 'w-9',
    meaning: 'Khả năng thích ứng linh hoạt trước sự thay đổi',
    word: 'ADAPTABILITY',
    wordType: 'Danh từ (Noun)',
    topic: 'Kỹ năng sinh tồn',
    example: '______ is essential for thriving in a volatile job market.',
  },
  {
    id: 'w-10',
    meaning: 'Sự biến đổi khí hậu trên phạm vi toàn cầu',
    word: 'CLIMATE CHANGE',
    wordType: 'Cụm danh từ (Noun Phrase)',
    topic: 'Môi trường',
    example: 'The conference focused on solutions to mitigate ______.',
  },
  {
    id: 'w-11',
    meaning: 'Sự đa dạng sinh học của các loài động thực vật',
    word: 'BIODIVERSITY',
    wordType: 'Danh từ (Noun)',
    topic: 'Tự nhiên',
    example: 'Rainforests harbor an immense wealth of ______.',
  },
  {
    id: 'w-12',
    meaning: 'Lòng nhân từ, hành động bác ái vì lợi ích cộng đồng',
    word: 'PHILANTHROPY',
    wordType: 'Danh từ (Noun)',
    topic: 'Xã hội & Đạo đức',
    example: 'His generous ______ funded schools in impoverished areas.',
  },
  {
    id: 'w-13',
    meaning: 'Hợp tác, làm việc cùng nhau để đạt mục tiêu chung',
    word: 'COLLABORATION',
    wordType: 'Danh từ (Noun)',
    topic: 'Làm việc nhóm',
    example: 'Effective ______ between teams led to the project success.',
  },
  {
    id: 'w-14',
    meaning: 'Trí tuệ nhân tạo có khả năng tự học hỏi',
    word: 'ARTIFICIAL INTELLIGENCE',
    wordType: 'Cụm danh từ (Noun Phrase)',
    topic: 'Công nghệ',
    example: '______ is rapidly advancing across various industries.',
  },
  {
    id: 'w-15',
    meaning: 'Hăng hái, nhiệt tình và kiên trì theo đuổi mục tiêu',
    word: 'ENTHUSIASM',
    wordType: 'Danh từ (Noun)',
    topic: 'Cảm xúc & Thái độ',
    example: 'She greeted the new project with immense ______.',
  },
];

export interface ArenaGameplayProps {
  matchData: MatchedPayload | null;
  onExitMatch: () => void;
  onFinishMatch?: () => void;
  onGameOver?: (gameOverData: GameOverPayload) => void;
}

export const ArenaGameplay: React.FC<ArenaGameplayProps> = ({
  matchData,
  onExitMatch,
  onFinishMatch,
  onGameOver,
}) => {
  // Trận đấu thời gian & tiến trình
  const [timeLeft, setTimeLeft] = useState<number>(
    matchData?.timeLimitSec || 360
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // Điểm số & Streak
  const [myScore, setMyScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [myStreak, setMyStreak] = useState<number>(0);

  // Trạng thái thông báo đối thủ & trạng thái kết thúc trận
  const [opponentNotice, setOpponentNotice] = useState<string | null>(null);
  const [isWaitingOpponent, setIsWaitingOpponent] = useState<boolean>(false);
  const [matchEndingOverlay, setMatchEndingOverlay] = useState<{
    show: boolean;
    type: 'WIN' | 'LOSS' | 'DRAW';
    noticeText?: string;
  } | null>(null);

  // Trạng thái modal xác nhận đầu hàng
  const [showSurrenderDialog, setShowSurrenderDialog] =
    useState<boolean>(false);

  // Trạng thái phản hồi đáp án: 'idle' | 'correct' | 'wrong'
  const [feedbackState, setFeedbackState] = useState<
    'idle' | 'correct' | 'wrong'
  >('idle');
  const [streakNotice, setStreakNotice] = useState<string | null>(null);

  // Danh sách câu hỏi (từ server nếu có, hoặc mock)
  const questions: QuestionItem[] =
    matchData?.questions && matchData.questions.length > 0
      ? matchData.questions.map((q: any, idx: number) => ({
        id: q.id || `q-${idx}`,
        meaning: q.meaning || 'Nghĩa tiếng Việt',
        word: (q.word || q.mask?.replace(/\s+/g, '') || 'WORD').toUpperCase(),
        wordType: q.word_type || 'Từ vựng',
        topic: q.topic || 'Đấu trường',
        example: q.example,
      }))
      : DEFAULT_MATCH_QUESTIONS;

  const currentQ = questions[currentQuestionIndex % questions.length];

  // ─── STATE CÁC Ô CHỮ WORDLE (HỖ TRỢ NHIỀU TỪ / PHRASE) ───
  // wordsArray: Tách cụm từ thành danh sách các từ: ví dụ ['ENVIRONMENT', 'CONSERVATION']
  const targetWords = currentQ.word.trim().split(/\s+/);

  // userInputs: mảng 2 chiều lưu từng ký tự người dùng gõ vào: userInputs[lineIdx][charIdx]
  const [userInputs, setUserInputs] = useState<string[][]>(() => {
    return targetWords.map((w) => {
      // Ô đầu tiên có sẵn chữ cái đầu, các ô còn lại rỗng
      return w.split('').map((char, idx) => (idx === 0 ? char : ''));
    });
  });

  // Cell đang được active / focus: { line: number, char: number }
  const [focusedCell, setFocusedCell] = useState<{
    line: number;
    char: number;
  }>({
    line: 0,
    char: targetWords[0]?.length > 1 ? 1 : 0,
  });

  const questionStartTimeRef = useRef<number>(Date.now());

  // Khi chuyển câu hỏi mới: Reset bảng ô chữ và focus vào ô thứ 2 của từ đầu tiên
  useEffect(() => {
    const newWords = currentQ.word.trim().split(/\s+/);
    setUserInputs(
      newWords.map((w) =>
        w.split('').map((char, idx) => (idx === 0 ? char : ''))
      )
    );
    setFocusedCell({
      line: 0,
      char: newWords[0]?.length > 1 ? 1 : 0,
    });
    setFeedbackState('idle');
    questionStartTimeRef.current = Date.now();
  }, [currentQuestionIndex, currentQ.word]);

  // Tự động căn chỉnh cỡ chữ của đề bài:
  // - Nếu ngắn (<= 35 ký tự): Chữ to rõ ràng
  // - Nếu dài vừa (36 - 55 ký tự): Thu nhỏ nhẹ để nằm vừa 1 dòng, không bị rớt chữ xuống dòng 2
  // - Nếu rất dài (> 55 ký tự): Chữ nhỏ, line-height gọn để 2 dòng bằng chiều cao 1 dòng to
  const getMeaningTypographyClass = (text: string) => {
    const len = text.trim().length;
    if (len <= 35) {
      return 'text-xl sm:text-2xl md:text-3xl font-black leading-snug';
    }
    if (len <= 55) {
      return 'text-base sm:text-lg md:text-xl font-black leading-tight max-w-xl mx-auto';
    }
    return 'text-xs sm:text-sm md:text-base font-bold leading-snug max-w-lg mx-auto';
  };

  // Tính kích thước ô Wordle theo độ dài từ dài nhất trong cụm
  const maxWordLength = Math.max(...targetWords.map((w) => w.length), 0);
  const getCellSizeClass = (maxLen: number) => {
    if (maxLen >= 11) {
      // Cụm từ dài như ENVIRONMENT, CONSERVATION (11-12 ký tự)
      return 'w-7 h-10 sm:w-9 sm:h-12 md:w-11 md:h-15 text-base sm:text-xl md:text-2xl rounded-lg sm:rounded-xl';
    }
    if (maxLen >= 9) {
      // Từ dài 9-10 ký tự như RESILIENT, EPHEMERAL
      return 'w-8 h-11 sm:w-11 sm:h-14 md:w-13 md:h-16 text-lg sm:text-2xl md:text-3xl rounded-xl sm:rounded-2xl';
    }
    // Từ ngắn dưới 9 ký tự
    return 'w-10 h-13 sm:w-13 sm:h-16 md:w-14 md:h-18 text-xl sm:text-2xl md:text-3xl rounded-xl sm:rounded-2xl';
  };
  const cellSizeClass = getCellSizeClass(maxWordLength);

  // Đếm ngược đồng hồ trận đấu
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinishMatch?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onFinishMatch]);

  // Lắng nghe điểm số thật của đối thủ từ Socket trong trận PvP thời gian thực
  useEffect(() => {
    const socket = arenaSocketService.getSocket();
    if (!socket) return;

    // 1. Tiến trình điểm đối thủ
    const handleOpponentProgress = (data: any) => {
      console.log('[Arena Gameplay] Nhận arena:opponent_progress:', data);
      const count =
        typeof data?.opponentCorrectCount === 'number'
          ? data.opponentCorrectCount
          : typeof data?.opponentCorrect === 'number'
            ? data.opponentCorrect
            : typeof data?.currentCorrect === 'number'
              ? data.currentCorrect
              : 0;
      const score =
        typeof data?.opponentScore === 'number'
          ? data.opponentScore
          : count * 10;
      setOpponentScore(score);
    };

    // 2. Đối thủ đã hoàn thành 25 câu
    const handleOpponentFinished = (data: any) => {
      console.log('[Arena Gameplay] Nhận arena:opponent_finished:', data);
      if (typeof data?.opponentScore === 'number') {
        setOpponentScore(data.opponentScore);
      } else if (typeof data?.opponentCorrect === 'number') {
        setOpponentScore(data.opponentCorrect * 10);
      }
      setOpponentNotice('Đối thủ đã hoàn thành xong 25 câu!');
      setTimeout(() => setOpponentNotice(null), 4000);
    };

    // 3. Mình đã hoàn thành 25 câu, đang chờ đối thủ
    const handleWaitingOpponent = () => {
      setIsWaitingOpponent(true);
    };

    // 4. Đối thủ đầu hàng
    const handleOpponentSurrendered = () => {
      setOpponentNotice('Đối thủ đã tuyên bố đầu hàng!');
      // 1.2s sau: kích hoạt Banner Victory to dần đập vào mặt
      setTimeout(() => {
        setMatchEndingOverlay({
          show: true,
          type: 'WIN',
          noticeText: 'Đối thủ đã tuyên bố đầu hàng!',
        });
      }, 1200);
    };

    // 5. Đối thủ ngắt kết nối / mất kết nối
    const handleOpponentDisconnected = () => {
      setOpponentNotice('Đối thủ đã mất kết nối!');
      // 1.2s sau: kích hoạt Banner Victory to dần đập vào mặt
      setTimeout(() => {
        setMatchEndingOverlay({
          show: true,
          type: 'WIN',
          noticeText: 'Đối thủ đã mất kết nối!',
        });
      }, 1200);
    };

    // 6. Kết quả ván đấu chính thức (arena:game_over)
    const handleGameOver = (data: GameOverPayload) => {
      console.log('[Arena Gameplay] Nhận kết quả game_over:', data);
      const resType = data.myResult; // 'WIN' | 'LOSS' | 'DRAW'

      setMatchEndingOverlay({
        show: true,
        type: resType,
        noticeText:
          data.reason === 'SURRENDER'
            ? resType === 'WIN'
              ? 'Đối thủ đã đầu hàng!'
              : 'Bạn đã đầu hàng'
            : data.reason === 'TIMEOUT'
            ? 'Hết thời gian thi đấu!'
            : undefined,
      });

      // Hiện banner to dần đập vào mặt 2.2 giây rồi chuyển sang màn hình kết quả
      setTimeout(() => {
        onGameOver?.(data);
      }, 2200);
    };

    socket.on('arena:opponent_progress', handleOpponentProgress);
    socket.on('arena:opponent_finished', handleOpponentFinished);
    socket.on('arena:waiting_opponent', handleWaitingOpponent);
    socket.on('arena:opponent_surrendered', handleOpponentSurrendered);
    socket.on('arena:opponent_disconnected', handleOpponentDisconnected);
    socket.on('arena:game_over', handleGameOver);

    return () => {
      socket.off('arena:opponent_progress', handleOpponentProgress);
      socket.off('arena:opponent_finished', handleOpponentFinished);
      socket.off('arena:waiting_opponent', handleWaitingOpponent);
      socket.off('arena:opponent_surrendered', handleOpponentSurrendered);
      socket.off('arena:opponent_disconnected', handleOpponentDisconnected);
      socket.off('arena:game_over', handleGameOver);
    };
  }, [onGameOver]);

  // Chỉ kích hoạt giả lập điểm nếu đang ở chế độ Solo Bot Dev Test
  useEffect(() => {
    const isBotDevTest = matchData?.opponent?.id === 'bot-lexi-ai';
    if (!isBotDevTest) return;

    const botInterval = setInterval(() => {
      setOpponentScore((prev) => Math.min(250, prev + 10));
    }, 9000);

    return () => clearInterval(botInterval);
  }, [matchData?.opponent?.id]);

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // ─── XỬ LÝ NHẬP LIỆU BÀN PHÍM WORDLE ───
  const handleCellClick = (lineIdx: number, charIdx: number) => {
    if (feedbackState !== 'idle') return;
    setFocusedCell({ line: lineIdx, char: charIdx });
  };

  // Di chuyển con trỏ focus sang ô tiếp theo
  const advanceFocus = useCallback(
    (currentLine: number, currentChar: number) => {
      const currentWordLen = targetWords[currentLine]?.length || 0;
      if (currentChar + 1 < currentWordLen) {
        // Cùng từ: sang ô kế tiếp
        setFocusedCell({ line: currentLine, char: currentChar + 1 });
      } else if (currentLine + 1 < targetWords.length) {
        // Chuyển sang từ tiếp theo (bỏ qua ô 0 có sẵn chữ cái đầu, focus ô 1)
        const nextWordLen = targetWords[currentLine + 1]?.length || 0;
        setFocusedCell({
          line: currentLine + 1,
          char: nextWordLen > 1 ? 1 : 0,
        });
      }
    },
    [targetWords]
  );

  // Di chuyển con trỏ lùi về ô trước
  const retreatFocus = useCallback(
    (currentLine: number, currentChar: number) => {
      if (currentChar > 1) {
        // Cùng từ: lùi lại
        setFocusedCell({ line: currentLine, char: currentChar - 1 });
      } else if (currentChar === 1) {
        // Về sát ô đầu
        setFocusedCell({ line: currentLine, char: 1 });
      } else if (currentLine > 0) {
        // Lùi về từ phía trước
        const prevWordLen = targetWords[currentLine - 1]?.length || 1;
        setFocusedCell({
          line: currentLine - 1,
          char: Math.max(1, prevWordLen - 1),
        });
      }
    },
    [targetWords]
  );

  // Cập nhật giá trị ô khi gõ ký tự (Hỗ trợ overwrite ngay lập tức khi click chọn ô)
  const setCharValue = useCallback(
    (lineIdx: number, charIdx: number, char: string) => {
      setUserInputs((prev) => {
        const next = prev.map((line) => [...line]);
        if (next[lineIdx]) {
          next[lineIdx][charIdx] = char.toUpperCase();
        }
        return next;
      });
      advanceFocus(lineIdx, charIdx);
    },
    [advanceFocus]
  );

  // ─── XÁC NHẬN NỘP ĐÁP ÁN (SUBMIT / ENTER) ───
  const handleConfirmAnswer = useCallback(() => {
    if (feedbackState !== 'idle') return;

    // Ghép toàn bộ ký tự thành đáp án người dùng
    const userWords = userInputs.map((line) => line.join(''));
    const fullUserAnswer = userWords.join(' ').trim().toUpperCase();
    const fullTargetAnswer = targetWords.join(' ').trim().toUpperCase();

    const isCorrect = fullUserAnswer === fullTargetAnswer;
    const timeSpentMs = Date.now() - questionStartTimeRef.current;

    if (isCorrect) {
      // 1. Khi trả lời đúng: gửi lên server, tăng điểm và cộng chuỗi
      if (matchData?.roomId) {
        arenaSocketService.submitAnswer(
          matchData.roomId,
          currentQuestionIndex,
          fullUserAnswer,
          timeSpentMs
        );
      }

      setFeedbackState('correct');
      // Mỗi câu đúng nhận đúng 10 điểm, 25 câu = 250 điểm
      const gainedScore = 10;
      setMyScore((s) => Math.min(250, s + gainedScore));
      setMyStreak((s) => s + 1);

      if (myStreak + 1 > 1) {
        setStreakNotice(`+10 ĐIỂM (x${myStreak + 1} STREAK!)`);
      } else {
        setStreakNotice(`+10 ĐIỂM`);
      }

      setTimeout(() => {
        setStreakNotice(null);
        setCurrentQuestionIndex((prev) => prev + 1);
      }, 800);
    } else {
      // 2. Khi trả lời sai: rung đỏ báo sai nhưng KHÔNG mất chuỗi streak, không gửi socket để người chơi sửa lại
      setFeedbackState('wrong');

      // Rung đỏ cảnh báo rồi cho phép sửa lại
      setTimeout(() => {
        setFeedbackState('idle');
      }, 700);
    }
  }, [
    feedbackState,
    userInputs,
    targetWords,
    myStreak,
    matchData,
    currentQuestionIndex,
  ]);

  // ─── BỎ QUA CÂU HỎI (SKIP) ───
  const handleSkipQuestion = useCallback(() => {
    if (feedbackState !== 'idle') return;

    // Chỉ khi chủ động bỏ qua câu hỏi thì MỚI BỊ MẤT CHUỖI STREAK
    setMyStreak(0);

    // Gửi socket lên server ghi nhận câu này là Bỏ qua (sai) để cập nhật tiến độ
    if (matchData?.roomId) {
      const timeSpentMs = Date.now() - questionStartTimeRef.current;
      arenaSocketService.submitAnswer(
        matchData.roomId,
        currentQuestionIndex,
        '', // Đáp án rỗng -> server tính là không đúng
        timeSpentMs
      );
    }

    setCurrentQuestionIndex((prev) => prev + 1);
  }, [feedbackState, matchData?.roomId, currentQuestionIndex]);

  // Lắng nghe bàn phím toàn cục (Keyboard Event Listener)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nếu đang mở dialog đầu hàng thì không bắt phím gõ chữ
      if (showSurrenderDialog) return;

      // Phím Enter -> Xác nhận đáp án
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmAnswer();
        return;
      }

      // Phím Backspace -> Xoá và lùi ô
      if (e.key === 'Backspace') {
        e.preventDefault();
        const currentLine = focusedCell.line;
        const currentChar = focusedCell.char;

        // Không xoá ô gợi ý đầu tiên (index 0)
        if (currentChar === 0) return;

        const currentVal = userInputs[currentLine]?.[currentChar] || '';
        if (currentVal !== '') {
          // Xoá ô hiện tại
          setUserInputs((prev) => {
            const next = prev.map((l) => [...l]);
            next[currentLine][currentChar] = '';
            return next;
          });
        } else {
          // Lùi về ô trước và xoá
          retreatFocus(currentLine, currentChar);
          setUserInputs((prev) => {
            const next = prev.map((l) => [...l]);
            const targetChar = Math.max(1, currentChar - 1);
            next[currentLine][targetChar] = '';
            return next;
          });
        }
        return;
      }

      // Phím mũi tên Left / Right
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        retreatFocus(focusedCell.line, focusedCell.char);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        advanceFocus(focusedCell.line, focusedCell.char);
        return;
      }

      // Gõ chữ cái [a-zA-Z]
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        // Không cho sửa đè ô gợi ý đầu tiên nếu ô 0
        if (focusedCell.char === 0) {
          advanceFocus(focusedCell.line, 0);
          return;
        }
        setCharValue(focusedCell.line, focusedCell.char, e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showSurrenderDialog,
    focusedCell,
    userInputs,
    handleConfirmAnswer,
    retreatFocus,
    advanceFocus,
    setCharValue,
  ]);

  // Xác nhận đầu hàng
  const handleConfirmSurrender = () => {
    if (matchData?.roomId) {
      arenaSocketService.surrender(matchData.roomId);
      arenaSocketService.leaveRoom(matchData.roomId);
    }
    setShowSurrenderDialog(false);
    onExitMatch();
  };

  const p1 = matchData?.me;
  const p2 = matchData?.opponent;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col justify-between overflow-y-auto select-none p-3 sm:p-5 lg:p-7 animate-in fade-in zoom-in-95 duration-200">
      {/* ── BACKGROUND GLOW PHONG CÁCH ĐẤU TRƯỜNG ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-amber-500/10 rounded-full blur-[130px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col justify-between min-h-full space-y-4 sm:space-y-6">
        {/* ── 1. TOP BAR: NÚT ĐẦU HÀNG • ĐỒNG HỒ 6 PHÚT • TIẾN ĐỘ CÂU HỎI ── */}
        <div className="flex items-center justify-between bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-md">
          {/* Nút Đầu hàng */}
          <button
            onClick={() => setShowSurrenderDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all active:scale-95 shadow-xs"
            title="Đầu hàng ván đấu"
          >
            <Flag className="w-3.5 h-3.5 fill-rose-500/20" />
            <span>Đầu hàng</span>
          </button>

          {/* Đồng hồ trận đấu */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary shadow-inner">
            <Timer className="w-4 h-4 animate-spin [animation-duration:10s]" />
            <span
              className={`font-mono text-base sm:text-lg font-black tracking-widest ${timeLeft <= 60 ? 'text-rose-500 animate-pulse' : ''
                }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Tiến độ câu hỏi */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-xl border border-border/60">
            <span>Câu</span>
            <span className="text-foreground font-black text-sm">
              {currentQuestionIndex + 1}
            </span>
            <span>/ {questions.length}</span>
          </div>
        </div>

        {/* ── BANNER THÔNG BÁO ĐẶC BIỆT TỪ ĐỐI THỦ HOẶC ĐỢI ĐỐI THỦ ── */}
        {opponentNotice && (
          <div className="w-full py-2.5 px-4 rounded-2xl bg-amber-500/20 border-2 border-amber-500 text-amber-300 text-xs sm:text-sm font-black flex items-center justify-center gap-2 animate-bounce shadow-lg">
            <Flag className="w-4 h-4 text-amber-400" />
            <span>{opponentNotice}</span>
          </div>
        )}

        {isWaitingOpponent && !matchEndingOverlay && (
          <div className="w-full py-2.5 px-4 rounded-2xl bg-primary/20 border-2 border-primary text-primary text-xs sm:text-sm font-black flex items-center justify-center gap-2 animate-pulse shadow-lg">
            <Sparkles className="w-4 h-4 text-primary animate-spin" />
            <span>Bạn đã hoàn thành 25 câu hỏi! Đang chờ đối thủ để phân định thắng thua...</span>
          </div>
        )}

        {/* ── 2. VS SCOREBOARD: ĐỐI ĐẦU ĐIỂM SỐ GIỮA BẠN & ĐỐI THỦ ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {/* Player 1 (Bạn) */}
          <div className="bg-gradient-to-r from-primary/15 via-card to-card border-2 border-primary/40 rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-md relative overflow-hidden">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border-2 border-primary/50 overflow-hidden bg-primary/10 flex items-center justify-center relative shrink-0 shadow-sm">
                {p1?.avatar_url ? (
                  <img
                    src={p1.avatar_url}
                    alt={p1.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-lg text-primary">
                    {p1?.full_name?.charAt(0) || 'B'}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs sm:text-sm text-foreground truncate max-w-[90px] sm:max-w-[150px]">
                    {p1?.full_name || 'Bạn'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-black uppercase">
                    BẠN
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <img
                    src={getRankBadgeUrl(p1?.arena_rank || 'BRONZE')}
                    alt={p1?.arena_rank}
                    className="w-4 h-4 object-contain"
                  />
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">
                    {p1?.leaderboard_point ?? p1?.rank_point ?? 0} LP
                  </span>
                </div>
              </div>
            </div>

            {/* Điểm số & Streak Bạn */}
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-black text-primary font-mono tracking-tight drop-shadow-sm">
                {myScore}
              </div>
              {myStreak > 1 ? (
                <div className="flex items-center justify-end gap-1 text-[10px] sm:text-[11px] font-black text-amber-500 animate-bounce">
                  <Flame className="w-3.5 h-3.5 fill-amber-500" />
                  <span>x{myStreak} STREAK</span>
                </div>
              ) : (
                <div className="text-[10px] font-bold text-muted-foreground uppercase">
                  ĐIỂM CỦA BẠN
                </div>
              )}
            </div>
          </div>

          {/* Player 2 (Đối thủ) */}
          <div className="bg-gradient-to-l from-rose-500/15 via-card to-card border-2 border-rose-500/30 rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-md relative overflow-hidden">
            {/* Điểm số đối thủ */}
            <div className="text-left">
              <div className="text-2xl sm:text-3xl font-black text-rose-500 font-mono tracking-tight drop-shadow-sm">
                {opponentScore}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase">
                ĐIỂM ĐỐI THỦ
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3.5 text-right">
              <div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-black uppercase">
                    ĐỐI THỦ
                  </span>
                  <span className="font-black text-xs sm:text-sm text-foreground truncate max-w-[90px] sm:max-w-[150px]">
                    {p2?.full_name || 'Đối thủ'}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">
                    {p2?.leaderboard_point ?? p2?.rank_point ?? 0} LP
                  </span>
                  <img
                    src={getRankBadgeUrl(p2?.arena_rank || 'BRONZE')}
                    alt={p2?.arena_rank}
                    className="w-4 h-4 object-contain"
                  />
                </div>
              </div>

              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border-2 border-rose-500/40 overflow-hidden bg-rose-500/10 flex items-center justify-center relative shrink-0 shadow-sm">
                {p2?.avatar_url ? (
                  <img
                    src={p2.avatar_url}
                    alt={p2.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-lg text-rose-400">
                    {p2?.full_name?.charAt(0) || 'E'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. KHU VỰC THI ĐẤU CHÍNH: CÂU HỎI TIẾNG VIỆT & BÀN CỜ WORDLE ── */}
        <div className="bg-card border-2 border-border/80 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative flex flex-col items-center justify-between flex-1 min-h-[360px] overflow-hidden">
          {/* Thông báo điểm streak nổi lên khi trả lời đúng */}
          {streakNotice && (
            <div className="absolute top-4 right-6 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black animate-[bounce_0.6s_ease_infinite] shadow-lg flex items-center gap-1.5 z-20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{streakNotice}</span>
            </div>
          )}

          {/* ĐỀ BÀI: NGHĨA TIẾNG VIỆT & CHỦ ĐỀ */}
          <div className="text-center space-y-1.5 sm:space-y-2 max-w-2xl mx-auto w-full">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 sm:py-1 rounded-full bg-muted/80 text-muted-foreground text-[11px] sm:text-xs font-bold border border-border/50">
              <span className="text-primary font-black uppercase">
                {currentQ.topic}
              </span>
              <span>•</span>
              <span>{currentQ.wordType}</span>
            </div>

            {/* Nghĩa tiếng Việt (Tự động co giãn cỡ chữ theo độ dài để nằm vừa 1 dòng hoặc 2 dòng thanh mảnh) */}
            <h2 className={`${getMeaningTypographyClass(currentQ.meaning)} text-foreground tracking-tight`}>
              "{currentQ.meaning}"
            </h2>

            {/* Câu ví dụ gợi ý ngữ cảnh (nếu có) */}
            {currentQ.example && (
              <p className="text-xs sm:text-sm text-muted-foreground italic max-w-xl mx-auto line-clamp-1 sm:line-clamp-2">
                Ví dụ: {currentQ.example}
              </p>
            )}
          </div>

          {/* BÀN CỜ Ô CHỮ WORDLE (CÓ SẴN CHỮ CÁI ĐẦU, BỔ SUNG OVERWRITE VÀ CỤM TỪ NHIỀU DÒNG) */}
          <div
            className={`my-3 sm:my-4 flex flex-col items-center justify-center gap-2 sm:gap-3 w-full transition-all duration-200 ${feedbackState === 'wrong' ? 'animate-[shake_0.4s_ease-in-out]' : ''
              }`}
          >
            {targetWords.map((word, lineIdx) => (
              <div
                key={`line-${lineIdx}`}
                className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap"
              >
                {word.split('').map((_char, charIdx) => {
                  const isFirstChar = charIdx === 0;
                  const value = userInputs[lineIdx]?.[charIdx] || '';
                  const isFocused =
                    focusedCell.line === lineIdx &&
                    focusedCell.char === charIdx;

                  let cellStyle =
                    'border-border/80 bg-background/80 text-foreground hover:border-primary/50';

                  if (isFirstChar) {
                    // Ô gợi ý đầu tiên
                    cellStyle =
                      'bg-primary/15 border-primary/50 text-primary font-black shadow-inner';
                  }

                  if (isFocused) {
                    cellStyle =
                      'border-primary bg-primary/10 ring-2 ring-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.35)] scale-105';
                  }

                  if (feedbackState === 'correct') {
                    cellStyle =
                      'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105';
                  } else if (feedbackState === 'wrong') {
                    cellStyle =
                      'border-rose-500 bg-rose-500/15 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
                  }

                  return (
                    <div
                      key={`cell-${lineIdx}-${charIdx}`}
                      onClick={() => handleCellClick(lineIdx, charIdx)}
                      className={`${cellSizeClass} border-2 flex items-center justify-center font-mono font-black uppercase cursor-pointer transition-all duration-150 select-none ${cellStyle}`}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ── 4. 2 BUTTON HÀNH ĐỘNG: BỎ QUA & XÁC NHẬN (ENTER) ── */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-md mx-auto mt-1 sm:mt-2 mb-1">
            {/* Nút Bỏ qua */}
            <button
              onClick={handleSkipQuestion}
              disabled={feedbackState !== 'idle'}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-5 rounded-2xl border-2 border-border/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs sm:text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <span>Bỏ qua</span>
              <X className="w-4 h-4" />
            </button>
            {/* Nút Xác nhận (Enter) */}
            <button
              onClick={handleConfirmAnswer}
              disabled={feedbackState !== 'idle'}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-black transition-all active:scale-95 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL / DIALOG XÁC NHẬN ĐẦU HÀNG ── */}
      {showSurrenderDialog && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border-2 border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border-2 border-rose-500/30 text-rose-500 mx-auto flex items-center justify-center shadow-inner">
              <Flag className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-foreground">
                Xác nhận đầu hàng?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Nếu đầu hàng giữa chừng, trận đấu sẽ kết thúc ngay lập tức. Bạn
                sẽ bị xử thua và bị trừ điểm Rank (RP) trên bảng xếp hạng!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowSurrenderDialog(false)}
                className="py-3 px-4 rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground font-bold text-xs sm:text-sm transition-colors"
              >
                Ở lại chiến đấu
              </button>
              <button
                onClick={handleConfirmSurrender}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                Chấp nhận đầu hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LỚP PHỦ BANNER VICTORY / DEFEAT / DRAW TO DẦN ĐẬP VÀO MẶT NGƯỜI CHƠI ── */}
      {matchEndingOverlay && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 select-none p-4">
          {/* Ánh hào quang tỏa ra từ trung tâm */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full blur-[140px] opacity-40 animate-pulse ${
                matchEndingOverlay.type === 'WIN'
                  ? 'bg-amber-400'
                  : matchEndingOverlay.type === 'LOSS'
                  ? 'bg-rose-500'
                  : 'bg-sky-400'
              }`}
            />
          </div>

          {/* Thông báo phụ nếu có (VD: Đối thủ đã đầu hàng / Đối thủ đã mất kết nối) */}
          {matchEndingOverlay.noticeText && (
            <div className="mb-4 sm:mb-6 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs sm:text-base font-black tracking-widest uppercase animate-in slide-in-from-top-4 duration-300 shadow-lg">
              {matchEndingOverlay.noticeText}
            </div>
          )}

          {/* Banner to dần đập vào mặt người chơi (Punch-In Animation) */}
          <div className="relative z-10 w-[340px] sm:w-[500px] md:w-[620px] animate-[punchIn_0.75s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
            <img
              src={
                matchEndingOverlay.type === 'WIN'
                  ? '/assets/banners/banner-victory.png'
                  : matchEndingOverlay.type === 'LOSS'
                  ? '/assets/banners/banner-defeat.png'
                  : '/assets/banners/banner-draw.png'
              }
              alt="Match Result Banner"
              className="w-full h-auto object-contain drop-shadow-[0_0_50px_rgba(255,215,0,0.6)]"
            />
          </div>

          {/* Emblem nổi bật phía dưới */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 -mt-6 sm:-mt-8 relative z-20 animate-in zoom-in-75 duration-700 delay-150">
            <img
              src={
                matchEndingOverlay.type === 'WIN'
                  ? '/assets/emblems/emblem-victory.png'
                  : matchEndingOverlay.type === 'LOSS'
                  ? '/assets/emblems/emblem-defeat.png'
                  : '/assets/emblems/emblem-draw.png'
              }
              alt="Emblem"
              className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            />
          </div>

          <p className="mt-4 sm:mt-6 text-xs sm:text-sm font-extrabold text-muted-foreground uppercase tracking-widest animate-pulse">
            Đang chuẩn bị bảng kết quả tổng kết...
          </p>
        </div>
      )}

      {/* CSS Animation Rung lắc khi trả lời sai & Banner Punch-In */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }

        @keyframes punchIn {
          0% {
            transform: scale(0.12);
            opacity: 0;
          }
          65% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ArenaGameplay;
