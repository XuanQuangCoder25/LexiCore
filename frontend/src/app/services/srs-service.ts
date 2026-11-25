import httpClient from './httpClient';

const SRS_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api/v1/srs`;

export interface ReviewedCardItem {
  cardId: string;
  front: string;
  back: string;
  phonetic?: string;
  partOfSpeech?: string;
  deckTitle: string;
  reviewsCount: number;
  distinctDaysCount: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: 'New' | 'Learning' | 'Review' | 'Relearning' | string;
  nextReviewDate: string;
}

export interface SawtoothPoint {
  x: number;
  dayIndex: number;
  label: string;
  date: string;
  withoutReview: number;
  withSrs: number;
  preReviewRetention?: number;
  isReviewEvent: boolean;
  isTroughPoint?: boolean;
  isNextDuePoint?: boolean;
  reviewNumber?: number;
  reviewQuality?: number;
  intervalAfter?: number;
  efAfter?: number;
}

export interface CardCurveData {
  cardId: string;
  front: string;
  back: string;
  phonetic?: string;
  deckTitle: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: string;
  reviewsCount: number;
  nextReviewDate: string;
  totalSpanDays: number;
  points: SawtoothPoint[];
}

export interface ForecastDayItem {
  offset: number;
  label: string;
  dayName: string;
  dateLabel: string;
  date: string;
  count: number;
  isToday: boolean;
}

export interface SM2CalcResult {
  quality: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: 'New' | 'Learning' | 'Review' | 'Relearning';
  label: string;
}

/**
 * Tính toán một mức đánh giá SM-2 Plus (đồng bộ 100% với hàm calculateSM2Plus tại backend/modules/srs/srs.service.ts)
 */
export function computeSingleSM2Plus(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number,
  previousReviewDate?: string | Date | null,
  currentStatus: 'New' | 'Learning' | 'Review' | 'Relearning' = 'New'
): SM2CalcResult {
  let efDelta = 0;
  if (quality >= 5) {
    efDelta = 0.10;
  } else if (quality >= 4) {
    efDelta = 0.00;
  } else if (quality >= 2) {
    efDelta = -0.10;
  } else {
    efDelta = -0.14;
  }

  let newEaseFactor = Math.round((easeFactor + efDelta) * 100) / 100;
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  let newInterval = 0;
  let newRepetitions = repetitions;
  let newStatus: 'New' | 'Learning' | 'Review' | 'Relearning' = currentStatus;

  let delayDays = 0;
  const now = new Date();
  if (previousReviewDate && interval > 0) {
    const prevDate = new Date(previousReviewDate);
    if (!isNaN(prevDate.getTime())) {
      const expectedReviewDate = new Date(prevDate.getTime() + interval * 24 * 60 * 60 * 1000);
      delayDays = Math.max(0, Math.floor((now.getTime() - expectedReviewDate.getTime()) / (24 * 60 * 60 * 1000)));
    }
  }

  if (quality < 2) {
    newRepetitions = 0;
    newInterval = 0;
    newStatus = 'Learning';
  } else if (quality < 4) {
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

  const label = newInterval === 0 ? 'Ôn lại ngay (0d)' : `${newInterval} ngày`;

  return {
    quality,
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    status: newStatus,
    label
  };
}

/**
 * Dự báo trước chu kỳ ôn tập tiếp theo và EF cho cả 4 nút bấm (Sai / Khó / Nhớ / Dễ) trên thẻ hiện tại
 */
export function previewSM2Intervals(card: any): {
  again: SM2CalcResult;
  hard: SM2CalcResult;
  good: SM2CalcResult;
  easy: SM2CalcResult;
} {
  const rep = Number(card?.repetitions ?? 0);
  const ef = Number(card?.easeFactor ?? 2.5);
  const interval = Number(card?.interval ?? 0);
  const prevDate = card?.previousReviewDate || null;
  const rawStatus = card?.status;
  const status: 'New' | 'Learning' | 'Review' | 'Relearning' =
    rawStatus === 'Learning' || rawStatus === 'Review' || rawStatus === 'Relearning' ? rawStatus : 'New';

  return {
    again: computeSingleSM2Plus(0, rep, ef, interval, prevDate, status),
    hard: computeSingleSM2Plus(2, rep, ef, interval, prevDate, status),
    good: computeSingleSM2Plus(4, rep, ef, interval, prevDate, status),
    easy: computeSingleSM2Plus(5, rep, ef, interval, prevDate, status),
  };
}

export const srsService = {
  getDecks: async (params?: { search?: string; level?: string; sort?: string }) =>
    (await httpClient.get(`${SRS_BASE}/decks`, { params })).data,
  getDueCards: async (courseId?: string) =>
    (await httpClient.get(`${SRS_BASE}/due${courseId ? `?courseId=${courseId}&_t=${Date.now()}` : `?_t=${Date.now()}`}`)).data,
  submitReview: async (data: { cardId: string; courseId: string; quality: number; responseTimeMs: number }) =>
    (await httpClient.post(`${SRS_BASE}/review`, data)).data,
  getStats: async () =>
    (await httpClient.get(`${SRS_BASE}/stats?_t=${Date.now()}`)).data,
  getReviewedCards: async (): Promise<{ success: boolean; data: ReviewedCardItem[] }> =>
    (await httpClient.get(`${SRS_BASE}/reviewed-cards?_t=${Date.now()}`)).data,
  getCardCurve: async (cardId: string): Promise<{ success: boolean; data: CardCurveData }> =>
    (await httpClient.get(`${SRS_BASE}/card-curve/${cardId}?_t=${Date.now()}`)).data,
  getForecast: async (): Promise<{ success: boolean; data: ForecastDayItem[] }> =>
    (await httpClient.get(`${SRS_BASE}/forecast?_t=${Date.now()}`)).data,
};
