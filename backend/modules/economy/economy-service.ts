import { AppError } from '../../errors/AppError';
import {
    getAllItemsForAdmin,
    createItem,
    updateItem,
    deactivateItem,
    activateItem,
    getActiveItems,
    findItemById,
    getUserInventory,
    purchaseItem,
} from './economy-repository';

export const adminGetAllItems = async () => {
    return await getAllItemsForAdmin();
};

export const adminCreateItem = async (data: any) => {
    if (!data.name || !data.type || data.price === undefined) {
        throw new AppError('Vui lòng cung cấp đầy đủ tên, loại và giá vật phẩm.', 400);
    }
    if (data.price < 0) {
        throw new AppError('Giá vật phẩm không thể là số âm.', 400);
    }
    return await createItem(data);
};

export const adminUpdateItem = async (id: string, data: any) => {
    const item = await findItemById(id);
    if (!item) {
        throw new AppError('Không tìm thấy vật phẩm.', 404);
    }
    await updateItem(id, data);
    return { message: 'Cập nhật vật phẩm thành công.' };
};

export const adminDeactivateItem = async (id: string) => {
    const item = await findItemById(id);
    if (!item) throw new AppError('Không tìm thấy vật phẩm.', 404);
    await deactivateItem(id);
    return { message: 'Vật phẩm đã được tạm ngưng bán.' };
};

export const adminActivateItem = async (id: string) => {
    const item = await findItemById(id);
    if (!item) throw new AppError('Không tìm thấy vật phẩm.', 404);
    await activateItem(id);
    return { message: 'Vật phẩm đã được kích hoạt trở lại.' };
};

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
