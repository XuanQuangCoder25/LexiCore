import { AppError } from '../../errors/AppError';
import {
    getActiveItems,
    findItemById,
    getUserInventory,
    purchaseItem,
} from './economy-repository';


export const getStoreItems = async () => {
    return await getActiveItems();
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
        throw error;
    }
};
