import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useEffect,
} from 'react';
import { Swords } from 'lucide-react';

export interface ArenaGateHandle {
  /**
   * Kịch bản 1: Đóng cửa sập lại -> Kích hoạt màn hình mới ngầm bên dưới -> Mở cửa toang ra
   * Phù hợp cho: Bấm Tìm trận (Lần 1), hoặc Chơi lại (Lần 4)
   */
  triggerGateTransition: (options?: {
    onMiddle?: () => void;
    onComplete?: () => void;
  }) => void;

  /**
   * Kịch bản 2: Đóng cửa sập lại -> Đếm ngược 3, 2, 1, FIGHT! trên phiến đá -> Mở toang cửa vào gameplay
   * Phù hợp cho: Cả 2 người chơi Ready (Lần 2)
   */
  triggerMatchStartCountdown: (options?: {
    onClosed?: () => void;
    onComplete?: () => void;
  }) => void;
}

export interface ArenaGateProps {
  onAnimationStart?: () => void;
}

export const ArenaGateTransition = forwardRef<ArenaGateHandle, ArenaGateProps>(
  ({ onAnimationStart }, ref) => {
    // Trạng thái cánh cửa: 'IDLE_OPEN' | 'CLOSING' | 'CLOSED' | 'OPENING'
    const [gateStatus, setGateStatus] = useState<
      'IDLE_OPEN' | 'CLOSING' | 'CLOSED' | 'OPENING'
    >('IDLE_OPEN');

    // Có đang rung chấn màn hình khi sập cửa không
    const [isShaking, setIsShaking] = useState(false);

    // Countdown state: null | '3' | '2' | '1' | 'FIGHT!'
    const [countdownStep, setCountdownStep] = useState<string | null>(null);

    // Timeout refs để dọn dẹp khi unmount
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

    const clearAllTimeouts = () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };

    useEffect(() => {
      return () => clearAllTimeouts();
    }, []);

    useImperativeHandle(ref, () => ({
      triggerGateTransition: ({ onMiddle, onComplete } = {}) => {
        clearAllTimeouts();
        onAnimationStart?.();
        setCountdownStep(null);

        // 1. Bắt đầu đóng cửa từ 2 bên mép vào giữa
        setGateStatus('CLOSING');

        // 2. Sau 500ms: 2 cánh cửa đã lao vào giữa và va chạm
        const t1 = setTimeout(() => {
          setGateStatus('CLOSED');
          setIsShaking(true);

          // Rung chấn va chạm cửa trong 250ms
          const tShake = setTimeout(() => setIsShaking(false), 250);
          timeoutsRef.current.push(tShake);

          // Kích hoạt callback đổi màn hình ngầm bên dưới (lúc này cửa đang che kín hoàn toàn)
          if (onMiddle) onMiddle();

          // 3. Dừng 250ms cho cảm giác đầm chắc chắn của phiến đá khép kín
          const t2 = setTimeout(() => {
            setGateStatus('OPENING');

            // 4. Mở cửa hoàn tất sau 500ms
            const t3 = setTimeout(() => {
              setGateStatus('IDLE_OPEN');
              if (onComplete) onComplete();
            }, 500);
            timeoutsRef.current.push(t3);
          }, 250);
          timeoutsRef.current.push(t2);
        }, 500);
        timeoutsRef.current.push(t1);
      },

      triggerMatchStartCountdown: ({ onClosed, onComplete } = {}) => {
        clearAllTimeouts();
        onAnimationStart?.();

        // 1. Đóng cửa sập lại từ 2 bên vào giữa
        setGateStatus('CLOSING');

        const t1 = setTimeout(() => {
          setGateStatus('CLOSED');
          setIsShaking(true);

          const tShake = setTimeout(() => setIsShaking(false), 300);
          timeoutsRef.current.push(tShake);

          // Báo cho parent biết cửa đã đóng kín để chuẩn bị màn hình gameplay
          if (onClosed) onClosed();

          // 2. Bắt đầu chuỗi đếm ngược trên phiến đá
          // Bước: '3' (bắt đầu sau 250ms khi vừa đóng)
          const tCount3 = setTimeout(() => {
            setCountdownStep('3');

            // Bước: '2' (sau 850ms)
            const tCount2 = setTimeout(() => {
              setCountdownStep('2');

              // Bước: '1' (sau 850ms)
              const tCount1 = setTimeout(() => {
                setCountdownStep('1');

                // Bước: 'FIGHT!' (sau 850ms)
                const tCountGo = setTimeout(() => {
                  setCountdownStep('FIGHT!');

                  // Sau chữ FIGHT! 650ms: Mở toang cánh cửa!
                  const tOpen = setTimeout(() => {
                    setCountdownStep(null);
                    setGateStatus('OPENING');

                    const tEnd = setTimeout(() => {
                      setGateStatus('IDLE_OPEN');
                      if (onComplete) onComplete();
                    }, 500);
                    timeoutsRef.current.push(tEnd);
                  }, 650);
                  timeoutsRef.current.push(tOpen);
                }, 850);
                timeoutsRef.current.push(tCountGo);
              }, 850);
              timeoutsRef.current.push(tCount1);
            }, 850);
            timeoutsRef.current.push(tCount2);
          }, 250);
          timeoutsRef.current.push(tCount3);
        }, 500);
        timeoutsRef.current.push(t1);
      },
    }));

    // Nếu đang ở trạng thái IDLE_OPEN và không có countdown thì không cần hiển thị
    if (gateStatus === 'IDLE_OPEN' && !countdownStep) {
      return null;
    }

    // Xác định CSS Animation cho cánh trái và cánh phải dựa trên gateStatus
    let leftDoorAnim = '';
    let rightDoorAnim = '';

    if (gateStatus === 'CLOSING') {
      leftDoorAnim = 'animate-[gateCloseLeft_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards]';
      rightDoorAnim = 'animate-[gateCloseRight_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards]';
    } else if (gateStatus === 'CLOSED') {
      leftDoorAnim = 'translate-x-0';
      rightDoorAnim = 'translate-x-0';
    } else if (gateStatus === 'OPENING') {
      leftDoorAnim = 'animate-[gateOpenLeft_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards]';
      rightDoorAnim = 'animate-[gateOpenRight_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards]';
    }

    return (
      <div
        className={`fixed inset-0 pointer-events-auto select-none z-[80] overflow-hidden ${
          isShaking ? 'animate-[gateShake_0.25s_ease-in-out]' : ''
        }`}
      >
        {/* ── CÁNH CỬA TRÁI (GATE LEFT) ── */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full will-change-transform overflow-hidden ${leftDoorAnim}`}
        >
          <img
            src="/assets/gates/gate-left.jpg"
            alt="Đấu Trường Cánh Trái"
            className="w-full h-full object-cover object-right pointer-events-none brightness-95 contrast-105"
          />
          {/* Lớp phủ shadow chiều sâu mép phải (khe giữa) */}
          <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-black/80 via-black/40 to-transparent pointer-events-none" />
          {/* Đường gân kim loại vàng đồng dọc mép cửa */}
          <div className="absolute top-0 right-0 w-[2.5px] h-full bg-gradient-to-b from-amber-600 via-amber-300 to-amber-700 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
        </div>

        {/* ── CÁNH CỬA PHẢI (GATE RIGHT) ── */}
        <div
          className={`absolute top-0 right-0 w-1/2 h-full will-change-transform overflow-hidden ${rightDoorAnim}`}
        >
          <img
            src="/assets/gates/gate-right.jpg"
            alt="Đấu Trường Cánh Phải"
            className="w-full h-full object-cover object-left pointer-events-none brightness-95 contrast-105"
          />
          {/* Lớp phủ shadow chiều sâu mép trái (khe giữa) */}
          <div className="absolute top-0 left-0 w-12 h-full bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
          {/* Đường gân kim loại vàng đồng dọc mép cửa */}
          <div className="absolute top-0 left-0 w-[2.5px] h-full bg-gradient-to-b from-amber-600 via-amber-300 to-amber-700 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
        </div>

        {/* ── KHE SÁNG RỰC LỬA Ở GIỮA KHI CỬA KHÉP KÍN ── */}
        {gateStatus === 'CLOSED' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-full bg-gradient-to-r from-transparent via-amber-400/30 to-transparent blur-md pointer-events-none animate-pulse" />
        )}

        {/* ── LỚP VÒNG SÁNG & ĐẾM NGƯỢC 3, 2, 1, FIGHT! ── */}
        {countdownStep && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            {/* Vòng hào quang huyền thoại xoay tròn */}
            <div className="relative flex items-center justify-center">
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 border-dashed border-amber-400/40 animate-[spin_12s_linear_infinite]" />
              <div className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full border-2 border-amber-500/50 blur-[2px] animate-pulse" />
              <div className="absolute w-40 h-40 sm:w-52 sm:h-52 bg-amber-500/10 rounded-full blur-2xl" />

              {/* Huy hiệu kiếm song đao mờ nền */}
              <div className="absolute opacity-20 text-amber-300">
                <Swords className="w-24 h-24 sm:w-32 sm:h-32" />
              </div>

              {/* Số hoặc Chữ đếm ngược với animation zoom slam rực lửa */}
              <div
                key={countdownStep}
                className="absolute flex items-center justify-center animate-[countdownPop_0.75s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              >
                {countdownStep === 'FIGHT!' ? (
                  <span className="text-5xl sm:text-7xl md:text-8xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-orange-500 drop-shadow-[0_0_35px_rgba(245,158,11,0.9)] animate-pulse">
                    FIGHT!
                  </span>
                ) : (
                  <span className="text-7xl sm:text-9xl md:text-[11rem] font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-600 drop-shadow-[0_0_40px_rgba(251,191,36,0.95)]">
                    {countdownStep}
                  </span>
                )}
              </div>
            </div>

            {/* Dòng chữ phụ trang nghiêm */}
            <p className="mt-8 text-xs sm:text-sm tracking-[0.3em] uppercase text-amber-200/90 font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.9)] animate-pulse">
              {countdownStep === 'FIGHT!'
                ? 'ĐẤU TRƯỜNG MỞ CỬA!'
                : 'CHUẨN BỊ BẮT ĐẦU'}
            </p>
          </div>
        )}

        {/* ── KEYFRAME ANIMATIONS ── */}
        <style>{`
          /* Animation đóng cửa từ ngoài mép màn hình vào giữa */
          @keyframes gateCloseLeft {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(0%); }
          }
          @keyframes gateCloseRight {
            0% { transform: translateX(100%); }
            100% { transform: translateX(0%); }
          }

          /* Animation mở cửa từ giữa bung ra 2 bên ngoài màn hình */
          @keyframes gateOpenLeft {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-100%); }
          }
          @keyframes gateOpenRight {
            0% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }

          /* Rung chấn va chạm khi 2 phiến đá sập vào nhau */
          @keyframes gateShake {
            0% { transform: translate(0, 0); }
            20% { transform: translate(-4px, 2px); }
            40% { transform: translate(4px, -2px); }
            60% { transform: translate(-2px, -1px); }
            80% { transform: translate(2px, 1px); }
            100% { transform: translate(0, 0); }
          }

          /* Hiệu ứng đếm ngược dội từ màn hình vào */
          @keyframes countdownPop {
            0% {
              transform: scale(2.2);
              opacity: 0;
              filter: blur(10px);
            }
            35% {
              transform: scale(1);
              opacity: 1;
              filter: blur(0px);
            }
            85% {
              transform: scale(1.05);
              opacity: 1;
            }
            100% {
              transform: scale(0.9);
              opacity: 0.8;
            }
          }
        `}</style>
      </div>
    );
  }
);

ArenaGateTransition.displayName = 'ArenaGateTransition';
export default ArenaGateTransition;
