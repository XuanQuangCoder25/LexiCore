import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/mysql';
import { generateSequentialId } from '../../utils/generateSequentialId';

const db = pool as any;

// DAILY / WEEKLY GOALS

export const getAllGoals = async (req: Request, res: Response): Promise<void> => {
    const [rows] = await db.execute(
        `SELECT id, title, description, icon, metric_key, target_value, reward_coin, reward_exp, type, is_active
         FROM daily_goal_definitions
         ORDER BY type, is_active DESC, title`
    );
    res.json({ success: true, data: rows });
};

export const toggleGoalActive = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const [rows] = await db.execute(
        `SELECT id, is_active, type FROM daily_goal_definitions WHERE id = ?`, [id]
    );
    const goal = rows[0];

    if (!goal) { res.status(404).json({ success: false, message: 'Không tìm thấy Goal.' }); return; }

    if (!goal.is_active) {
        const [activeRows] = await db.execute(
            `SELECT COUNT(*) as cnt FROM daily_goal_definitions WHERE type = ? AND is_active = TRUE`, [goal.type]
        );
        const activeCount = activeRows[0].cnt;
        if (activeCount >= 3) {
            res.status(400).json({ success: false, message: `Đã có đủ 3 quest ${goal.type} đang hoạt động. Hãy tắt 1 quest trước.` });
            return;
        }
    }

    await db.execute(`UPDATE daily_goal_definitions SET is_active = NOT is_active WHERE id = ?`, [id]);
    res.json({ success: true, message: `Đã ${goal.is_active ? 'tắt' : 'bật'} Quest.` });
};

// ACHIEVEMENTS CRUD

export const getAllAchievements = async (req: Request, res: Response): Promise<void> => {
    const [rows] = await db.execute(
        `SELECT id, title, description, icon, category, target_value, metric_key,
                reward_coin, reward_diamond, reward_exp, is_deleted
         FROM achievement_definitions
         ORDER BY is_deleted ASC, category, target_value`
    );
    res.json({ success: true, data: rows });
};

export const createAchievement = async (req: Request, res: Response): Promise<void> => {
    const { title, description, icon, category, target_value, metric_key, reward_coin, reward_diamond, reward_exp } = req.body;

    if (!title || !category || !target_value || !metric_key) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: title, category, target_value, metric_key.' });
        return;
    }

    const id = await generateSequentialId('achievement', 'achievement_definitions');

    await db.execute(
        `INSERT INTO achievement_definitions (id, title, description, icon, category, target_value, metric_key, reward_coin, reward_diamond, reward_exp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, title, description || null, icon || 'Trophy', category, target_value, metric_key,
            reward_coin || 0, reward_diamond || 0, reward_exp || 0]
    );
    res.status(201).json({ success: true, message: 'Tạo Thành Tựu thành công.', id });
};

export const updateAchievement = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { title, description, icon, category, target_value, metric_key, reward_coin, reward_diamond, reward_exp } = req.body;

    await db.execute(
        `UPDATE achievement_definitions SET title=?, description=?, icon=?, category=?, target_value=?, metric_key=?,
         reward_coin=?, reward_diamond=?, reward_exp=? WHERE id=? AND is_deleted = FALSE`,
        [title, description, icon, category, target_value, metric_key, reward_coin, reward_diamond, reward_exp, id]
    );
    res.json({ success: true, message: 'Đã cập nhật Thành Tựu.' });
};

export const deleteAchievement = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await db.execute(`UPDATE achievement_definitions SET is_deleted = TRUE WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Đã xóa mềm Thành Tựu.' });
};

// COLLECTIONS CRUD

export const getAllCollections = async (req: Request, res: Response): Promise<void> => {
    const [rows] = await db.execute(
        `SELECT c.id, c.name, c.description, c.unlock_level, c.theme_color, c.is_deleted,
                COUNT(i.id) as total_items,
                (SELECT image_url FROM items WHERE collection_id = c.id AND image_url IS NOT NULL LIMIT 1) as image_url
         FROM collections c
         LEFT JOIN items i ON i.collection_id = c.id
         GROUP BY c.id
         ORDER BY c.is_deleted ASC, c.unlock_level`
    );
    res.json({ success: true, data: rows });
};

export const createCollection = async (req: Request, res: Response): Promise<void> => {
    const { name, description, unlock_level, theme_color } = req.body;

    if (!name || unlock_level === undefined) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: name, unlock_level.' });
        return;
    }

    const id = await generateSequentialId('collection', 'collections');
    await db.execute(
        `INSERT INTO collections (id, name, description, unlock_level, theme_color) VALUES (?, ?, ?, ?, ?)`,
        [id, name, description || null, unlock_level, theme_color || '#3b82f6']
    );
    res.status(201).json({ success: true, message: 'Tạo Collection thành công.', id });
};

export const updateCollection = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, description, unlock_level, theme_color, is_deleted } = req.body;

    let query = `UPDATE collections SET name=?, description=?, unlock_level=?, theme_color=?`;
    const params: any[] = [name, description, unlock_level, theme_color];
    
    if (is_deleted !== undefined) {
        query += `, is_deleted=?`;
        params.push(is_deleted);
    }
    
    query += ` WHERE id=?`;
    params.push(id);

    await db.execute(query, params);
    res.json({ success: true, message: 'Đã cập nhật Collection.' });
};

export const deleteCollection = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await db.execute(`UPDATE collections SET is_deleted = TRUE WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Đã xóa mềm Collection.' });
};

export const toggleCollectionActive = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await db.execute(`UPDATE collections SET is_deleted = NOT is_deleted WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Đã thay đổi trạng thái Collection.' });
};

// ITEMS CRUD

export const getAllItems = async (req: Request, res: Response): Promise<void> => {
    const [rows] = await db.execute(
        `SELECT i.id, i.name, i.type, i.price, i.price_type, i.description, i.image_url,
                i.required_level, i.is_active, i.collection_id, c.name as collection_name
         FROM items i
         LEFT JOIN collections c ON i.collection_id = c.id
         ORDER BY i.is_active DESC, i.collection_id, i.type`
    );
    res.json({ success: true, data: rows });
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
    const { name, type, price, price_type, description, image_url, required_level, collection_id } = req.body;

    if (!name || !type || price === undefined) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: name, type, price.' });
        return;
    }

    let id: string;
    if (collection_id) {
        const [colRows] = await db.execute(`SELECT id FROM collections WHERE id = ?`, [collection_id]);
        if (colRows.length === 0) {
            res.status(400).json({ success: false, message: 'Collection không tồn tại.' });
            return;
        }
        const prefix = `${type.toLowerCase()}_${collection_id}`;
        id = await generateSequentialId(prefix, 'items');
    } else {
        id = uuidv4();
    }

    await db.execute(
        `INSERT INTO items (id, name, type, price, price_type, description, image_url, required_level, collection_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, type, price, price_type || 'COIN', description || null,
            image_url || null, required_level || 1, collection_id || null]
    );
    res.status(201).json({ success: true, message: 'Tạo Item thành công.', id });
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, type, price, price_type, description, image_url, required_level, collection_id, is_active } = req.body;

    await db.execute(
        `UPDATE items SET name=?, type=?, price=?, price_type=?, description=?, image_url=?,
         required_level=?, collection_id=?, is_active=? WHERE id=?`,
        [name, type, price, price_type, description, image_url, required_level, collection_id || null, is_active, id]
    );
    res.json({ success: true, message: 'Đã cập nhật Item.' });
};

export const toggleItemActive = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const [rows] = await db.execute(`SELECT is_active FROM items WHERE id = ?`, [id]);
    const item = rows[0];

    if (!item) {
        res.status(404).json({ success: false, message: 'Không tìm thấy Item.' });
        return;
    }

    await db.execute(`UPDATE items SET is_active = NOT is_active WHERE id = ?`, [id]);
    res.json({ success: true, message: `Đã ${item.is_active ? 'ẩn' : 'hiện'} Item trong cửa hàng.` });
};
