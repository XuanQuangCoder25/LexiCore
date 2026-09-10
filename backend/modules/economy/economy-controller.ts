import { Request, Response, NextFunction } from 'express';
import {
    adminGetAllItems,
    adminCreateItem,
    adminUpdateItem,
    adminDeactivateItem,
    adminActivateItem,
    getStoreItems,
    getInventory,
    buyItem,
} from './economy-service';

export const getAllItemsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const items = await adminGetAllItems();
        res.status(200).json(items);
    } catch (error) {
        next(error);
    }
};

export const createItemHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const item = await adminCreateItem(req.body);
        res.status(201).json({ message: 'Thêm vật phẩm thành công.', item });
    } catch (error) {
        next(error);
    }
};

export const updateItemHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await adminUpdateItem(req.params.id as string, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const deactivateItemHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await adminDeactivateItem(req.params.id as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const activateItemHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await adminActivateItem(req.params.id as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getStoreItemsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const items = await getStoreItems();
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
