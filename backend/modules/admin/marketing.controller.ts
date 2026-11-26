import { Request, Response, NextFunction } from 'express';
import {
    adminGetAllPackagesWithSaleStatus,
    adminSetPackageSale,
    adminListRewardCampaigns,
    adminCreateRewardCampaign,
    adminToggleRewardCampaign,
    adminDeleteRewardCampaign,
    adminGetSystemAnnouncements,
    adminStartMaintenance,
    adminEndMaintenance,
    adminSendEmailBlast,
    adminGetEmailBlastLogs,
    adminGetPaymentAnnouncements,
    adminCreatePaymentAnnouncement,
    adminUpdatePaymentAnnouncement,
    adminTogglePaymentAnnouncement,
    adminDeletePaymentAnnouncement,
} from './marketing.service';

// --- Sale % ---

export const getPackagesWithSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await adminGetAllPackagesWithSaleStatus();
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const setPackageSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const packageId = req.params.id as string;
        const { sale_percent, sale_starts_at, sale_ends_at } = req.body;
        const result = await adminSetPackageSale({
            packageId,
            salePercent: Number(sale_percent),
            saleStartsAt: sale_starts_at || null,
            saleEndsAt: sale_ends_at || null,
        });
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

// --- Reward Campaigns ---

export const listRewardCampaigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await adminListRewardCampaigns();
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createRewardCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id as string;
        const {
            name,
            description,
            coin_amount,
            diamond_amount,
            item_id,
            fallback_coin,
            starts_at,
            ends_at,
        } = req.body;

        const result = await adminCreateRewardCampaign({
            name,
            description,
            coinAmount: Number(coin_amount || 0),
            diamondAmount: Number(diamond_amount || 0),
            itemId: item_id || undefined,
            fallbackCoin: fallback_coin !== undefined ? Number(fallback_coin) : 50,
            startsAt: starts_at,
            endsAt: ends_at,
            createdBy: userId,
        });

        res.status(201).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const toggleRewardCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const result = await adminToggleRewardCampaign(id);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const deleteRewardCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const result = await adminDeleteRewardCampaign(id);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

// --- System Announcements & Maintenance ---

export const getSystemAnnouncements = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await adminGetSystemAnnouncements();
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const startMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id as string;
        const { title, message, estimated_end, send_email, delay_minutes } = req.body;
        const result = await adminStartMaintenance({
            title,
            message,
            estimatedEnd: estimated_end || null,
            sendEmail: Boolean(send_email),
            delayMinutes: delay_minutes !== undefined ? Number(delay_minutes) : 3,
            createdBy: userId,
        });
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const endMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string | undefined;
        const result = await adminEndMaintenance(id);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

// --- Email Blast ---

export const getEmailBlastLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await adminGetEmailBlastLogs();
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const sendEmailBlast = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id as string;
        const {
            subject,
            heading,
            message,
            badge_text,
            badge_type,
            action_text,
            action_url,
            target_audience,
        } = req.body;

        const result = await adminSendEmailBlast({
            subject,
            heading,
            message,
            badgeText: badge_text,
            badgeType: badge_type,
            actionText: action_text,
            actionUrl: action_url,
            targetAudience: target_audience || 'ALL',
            createdBy: userId,
        });

        // Trả về 202 Accepted vì email blast chạy ngầm trong tiến trình nền
        res.status(202).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

// --- Payment Announcements (Tab Thông tin SubscriptionModal) ---

export const listPaymentAnnouncementsAdmin = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await adminGetPaymentAnnouncements();
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createPaymentAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id as string;
        const { title, content, type, starts_at, ends_at } = req.body;
        const result = await adminCreatePaymentAnnouncement({
            title,
            content,
            type,
            startsAt: starts_at || null,
            endsAt: ends_at || null,
            createdBy: userId,
        });
        res.status(201).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const updatePaymentAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { title, content, type, starts_at, ends_at } = req.body;
        const result = await adminUpdatePaymentAnnouncement(id, {
            title,
            content,
            type,
            startsAt: starts_at || null,
            endsAt: ends_at || null,
        });
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const togglePaymentAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const result = await adminTogglePaymentAnnouncement(id);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const deletePaymentAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const result = await adminDeletePaymentAnnouncement(id);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};
