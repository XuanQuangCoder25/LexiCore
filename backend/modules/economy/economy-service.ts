import { AppError } from '../../errors/AppError';
import {
    getActiveItems,
    findItemById,
    getUserInventory,
    purchaseItem,
    equipItemInDb,
} from './economy-repository';


export const getStoreItems = async (userId: string) => {
    return await getActiveItems(userId);
};

export const getInventory = async (userId: string) => {
    return await getUserInventory(userId);
};

export const buyItem = async (userId: string, itemId: string) => {
    const item = await findItemById(itemId);

    if (!item) {
        throw new AppError('Vật phẩm không tồn tại.', 404);
    }
    if (!item.is_active) {
        throw new AppError('Vật phẩm này hiện không còn được bán.', 400);
    }

    try {
        await purchaseItem(userId, item);
        return { message: `Mua thành công vật phẩm "${item.name}"!` };
    } catch (error: any) {
        if (error.message === 'INSUFFICIENT_BALANCE') {
            throw new AppError('Số xu trong ví không đủ để mua vật phẩm này.', 400);
        }
        if (error.message === 'ALREADY_OWNED') {
            throw new AppError('Bạn đã sở hữu vật phẩm này rồi, không thể mua thêm.', 400);
        }
        throw error;
    }
};

export const equipItem = async (userId: string, itemId: string) => {
    try {
        await equipItemInDb(userId, itemId);
        return { message: "Trang bị thành công!" };
    } catch (error: any) {
        if (error.message === 'NOT_OWNED') {
            throw new AppError('Bạn chưa sở hữu vật phẩm này.', 400);
        }
        if (error.message === 'NOT_FOUND') {
            throw new AppError('Vật phẩm không tồn tại.', 404);
        }
        if (error.message === 'NOT_EQUIPPABLE') {
            throw new AppError('Vật phẩm này không thể trang bị.', 400);
        }
        throw error;
    }
};
