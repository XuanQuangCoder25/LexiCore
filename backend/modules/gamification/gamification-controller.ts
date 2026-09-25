import { Request, Response } from 'express';
import * as gamificationRepo from './gamification-repository';

export const getDailyGoals = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const goals = await gamificationRepo.getDailyGoals(userId);
        res.json({ success: true, data: goals });
    } catch (error: any) {
        console.error('Error fetching daily goals:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const claimDailyGoal = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { goalId } = req.params;
        const result = await gamificationRepo.claimDailyGoal(userId, goalId as string);
        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Error claiming daily goal:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAchievements = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const achievements = await gamificationRepo.getAchievements(userId);
        res.json({ success: true, data: achievements });
    } catch (error: any) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const leaderboard = await gamificationRepo.getLeaderboard();
        res.json({ success: true, data: leaderboard });
    } catch (error: any) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCollections = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const collections = await gamificationRepo.getCollections(userId);
        res.json({ success: true, data: collections });
    } catch (error: any) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
