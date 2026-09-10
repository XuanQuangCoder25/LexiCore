import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';


export const getAllItemsForAdmin = async () => {
    const [rows] = await pool.execute(
        `SELECT id, name, type, price, description, is_active FROM items ORDER BY created_at DESC`
    );
    return rows as any[];
};

export const createItem = async (data: { name: string; type: string; price: number; description?: string }) => {
    const id = uuidv4();
    await pool.execute(
        `INSERT INTO items (id, name, type, price, description, is_active) VALUES (?, ?, ?, ?, ?, TRUE)`,
        [id, data.name, data.type, data.price, data.description ?? null]
    );
    return { id, ...data };
};

export const updateItem = async (id: string, data: { name?: string; type?: string; price?: number; description?: string }) => {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }

    if (fields.length === 0) return;

    values.push(id);
    await pool.execute(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`, values);
};

export const deactivateItem = async (id: string) => {
    await pool.execute(`UPDATE items SET is_active = FALSE WHERE id = ?`, [id]);
};

export const activateItem = async (id: string) => {
    await pool.execute(`UPDATE items SET is_active = TRUE WHERE id = ?`, [id]);
};


export const getActiveItems = async () => {
    const [rows] = await pool.execute(
        `SELECT id, name, type, price, description FROM items WHERE is_active = TRUE ORDER BY price ASC`
    );
    return rows as any[];
};

export const findItemById = async (id: string) => {
    const [rows] = await pool.execute(
        `SELECT id, name, type, price, is_active FROM items WHERE id = ? LIMIT 1`,
        [id]
    );
    const items = rows as any[];
    return items.length > 0 ? items[0] : null;
};

export const getUserInventory = async (userId: string) => {
    const [rows] = await pool.execute(
        `SELECT ui.id, ui.quantity, i.name, i.type, i.description
         FROM user_items ui
         JOIN items i ON i.id = ui.item_id
         WHERE ui.user_id = ?`,
        [userId]
    );
    return rows as any[];
};

export const purchaseItem = async (userId: string, item: { id: string; name: string; price: number }) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [walletRows] = await connection.execute(
            `SELECT coin_balance FROM wallets WHERE user_id = ? FOR UPDATE`,
            [userId]
        );
        const wallet = (walletRows as any[])[0];

        if (!wallet || wallet.coin_balance < item.price) {
            throw new Error('INSUFFICIENT_BALANCE');
        }

        await connection.execute(
            `UPDATE wallets SET coin_balance = coin_balance - ? WHERE user_id = ?`,
            [item.price, userId]
        );

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
        return true;

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};
