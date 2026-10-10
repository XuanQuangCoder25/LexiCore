import { Request, Response, NextFunction } from 'express';
import {
    getStoreItems,
    getInventory,
    buyItem,
    equipItem,
} from './economy-service';

export const getStoreItemsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const items = await getStoreItems(req.user!.id);
        res.status(200).json(items);
    } catch (error) {
        next(error);
    }
};

export const getInventoryHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const items = await getInventory(req.user!.id);
        res.status(200).json(items);
    } catch (error) {
        next(error);
    }
};

export const buyItemHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await buyItem(req.user!.id, req.params.itemId as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const equipItemHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await equipItem(req.user!.id, req.params.itemId as string);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};
