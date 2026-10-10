import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import { updateAchievementProgress, updateGoalProgress } from '../gamification/gamification-repository';




export const getActiveItems = async (userId: string) => {
    const [rows] = await pool.execute(
        `SELECT i.id, i.name, i.type, i.price, i.price_type, i.description, i.image_url, i.required_level, i.collection_id,
                CASE WHEN ui.item_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_owned
         FROM items i
         LEFT JOIN user_items ui ON i.id = ui.item_id AND ui.user_id = ?
         WHERE i.is_active = TRUE 
         ORDER BY is_owned ASC, i.price ASC`,
        [userId]
    );
    return rows as any[];
};

export const findItemById = async (id: string) => {
    const [rows] = await pool.execute(
        `SELECT id, name, type, price, price_type, is_active, collection_id, image_url FROM items WHERE id = ? LIMIT 1`,
        [id]
    );
    const items = rows as any[];
    return items.length > 0 ? items[0] : null;
};

export const getUserInventory = async (userId: string) => {
    const [rows] = await pool.execute(
        `SELECT i.id, ui.quantity, i.name, i.type, i.description, i.image_url
         FROM user_items ui
         JOIN items i ON i.id = ui.item_id
         WHERE ui.user_id = ?`,
        [userId]
    );
    return rows as any[];
};

export const purchaseItem = async (userId: string, item: { id: string; name: string; price: number; type: string; price_type: string }) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [ownedRows] = await connection.execute(
            `SELECT id FROM user_items WHERE user_id = ? AND item_id = ?`,
            [userId, item.id]
        );
        if ((ownedRows as any[]).length > 0) {
            if (['AVATAR', 'COVER_PHOTO', 'THEME'].includes(item.type)) {
                throw new Error('ALREADY_OWNED');
            }
        }

        const [walletRows] = await connection.execute(
            `SELECT coin_balance, diamond_balance FROM wallets WHERE user_id = ? FOR UPDATE`,
            [userId]
        );
        const wallet = (walletRows as any[])[0];

        if (!wallet) {
            throw new Error('INSUFFICIENT_BALANCE');
        }

        if (item.price_type === 'COIN') {
            if (wallet.coin_balance < item.price) throw new Error('INSUFFICIENT_BALANCE');
            await connection.execute(`UPDATE wallets SET coin_balance = coin_balance - ? WHERE user_id = ?`, [item.price, userId]);
        } else if (item.price_type === 'DIAMOND') {
            if (wallet.diamond_balance < item.price) throw new Error('INSUFFICIENT_BALANCE');
            await connection.execute(`UPDATE wallets SET diamond_balance = diamond_balance - ? WHERE user_id = ?`, [item.price, userId]);
        } else {
            // Default to coin if price_type is not defined correctly
            if (wallet.coin_balance < item.price) throw new Error('INSUFFICIENT_BALANCE');
            await connection.execute(`UPDATE wallets SET coin_balance = coin_balance - ? WHERE user_id = ?`, [item.price, userId]);
        }

        await connection.execute(
            `INSERT INTO user_items (id, user_id, item_id, quantity)
             VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
            [uuidv4(), userId, item.id]
        );

        await connection.execute(
            `INSERT INTO billing_transactions (id, user_id, amount, transaction_type, metadata)
             VALUES (?, ?, ?, 'BUY_ITEM', ?)`,
            [uuidv4(), userId, -item.price, JSON.stringify({ item_id: item.id, item_name: item.name })]
        );

        await connection.commit();

        // --- Achievement Events (chạy sau commit, không ảnh hưởng transaction) ---
        // 1. Tổng xu đã tiêu
        await updateAchievementProgress(userId, 'total_coin_spent', item.price);
        await updateGoalProgress(userId, 'total_coin_spent', item.price);

        // 2. Kiểm tra bộ sưu tập hoàn chỉnh (nếu item thuộc 1 collection)
        if ((item as any).collection_id) {
            const collectionId = (item as any).collection_id;
            const [countRows] = await pool.execute(
                `SELECT
                   (SELECT COUNT(*) FROM items WHERE collection_id = ?) AS total_items,
                   (SELECT COUNT(DISTINCT ui.item_id) FROM user_items ui
                    JOIN items i ON ui.item_id = i.id
                    WHERE i.collection_id = ? AND ui.user_id = ?) AS owned_items`,
                [collectionId, collectionId, userId]
            );
            const { total_items, owned_items } = (countRows as any[])[0];
            if (total_items > 0 && owned_items >= total_items) {
                await updateAchievementProgress(userId, 'collection_completed', 1);
                await updateGoalProgress(userId, 'collection_completed', 1);
            }
        }

        return true;

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const equipItemInDb = async (userId: string, itemId: string) => {
    const [ownedRows] = await pool.execute(
        `SELECT id FROM user_items WHERE user_id = ? AND item_id = ?`,
        [userId, itemId]
    );
    if ((ownedRows as any[]).length === 0) {
        throw new Error('NOT_OWNED');
    }

    const item = await findItemById(itemId);
    if (!item) throw new Error('NOT_FOUND');

    if (item.type === 'AVATAR') {
        await pool.execute(`UPDATE users SET avatar_url = ? WHERE id = ?`, [item.image_url, userId]);
    } else if (item.type === 'COVER_PHOTO') {
        await pool.execute(`UPDATE users SET cover_url = ? WHERE id = ?`, [item.image_url, userId]);
    } else {
        throw new Error('NOT_EQUIPPABLE');
    }
};
