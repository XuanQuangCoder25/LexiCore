import { Request, Response, NextFunction } from 'express';
import {
    adminGetCampaigns,
    adminCreateCampaign,
    adminToggleCampaign,
    adminDeleteCampaign,
} from '../payment/campaign.service';

// GET /api/admin/campaigns
export const getCampaigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaigns = await adminGetCampaigns();
        res.json({ success: true, data: campaigns });
    } catch (err) {
        next(err);
    }
};

// POST /api/admin/campaigns
export const createNewCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            name,
            tier,
            duration_days,
            starts_at,
            ends_at,
            is_active,
        } = req.body;

        const result = await adminCreateCampaign({
            name,
            tier,
            duration_days: Number(duration_days),
            starts_at,
            ends_at,
            is_active,
        });

        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/campaigns/:id/toggle
export const toggleCampaignStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const result = await adminToggleCampaign(id);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/admin/campaigns/:id
export const removeCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const result = await adminDeleteCampaign(id);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};
