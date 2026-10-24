import { Request, Response, NextFunction } from 'express';
import { socialService } from './social.service';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const param = (req: Request, name: string): string => String(req.params[name] ?? '');

export const socialController: Record<string, Handler> = {
    // ---------------------------------------------------------------- USERS
    // GET /api/social/users/search?q=
    async searchUsers(req, res, next) {
        try {
            const data = await socialService.searchUsers(req.user!.id, req.query.q);
            res.status(200).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    },

    // ------------------------------------------------------------- FRIENDS
    // GET /api/social/friends?q=
    async listFriends(req, res, next) {
        try {
            const data = await socialService.listFriends(req.user!.id, req.query.q);
            res.status(200).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/social/friends/:userId
    async removeFriend(req, res, next) {
        try {
            await socialService.removeFriend(req.user!.id, param(req, 'userId'));
            res.status(200).json({ status: 'success', message: 'Đã hủy kết bạn.' });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/social/friends/requests?direction=received|sent
    async listRequests(req, res, next) {
        try {
            const data = await socialService.listRequests(req.user!.id, req.query.direction);
            res.status(200).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/social/friends/requests   { receiverId }
    async sendRequest(req, res, next) {
        try {
            const data = await socialService.sendFriendRequest(req.user!.id, req.body?.receiverId);
            res.status(201).json({
                status: 'success',
                message: data.status === 'accepted' ? 'Hai bạn đã trở thành bạn bè.' : 'Đã gửi lời mời kết bạn.',
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/social/friends/requests/:requestId/accept
    async acceptRequest(req, res, next) {
        try {
            const data = await socialService.respondToRequest(req.user!.id, param(req, 'requestId'), 'accept');
            res.status(200).json({ status: 'success', message: 'Đã chấp nhận lời mời kết bạn.', data });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/social/friends/requests/:requestId/reject
    async rejectRequest(req, res, next) {
        try {
            const data = await socialService.respondToRequest(req.user!.id, param(req, 'requestId'), 'reject');
            res.status(200).json({ status: 'success', message: 'Đã từ chối lời mời kết bạn.', data });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/social/friends/requests/:requestId  (người gửi huỷ lời mời)
    async cancelRequest(req, res, next) {
        try {
            const data = await socialService.cancelRequest(req.user!.id, param(req, 'requestId'));
            res.status(200).json({ status: 'success', message: 'Đã hủy lời mời kết bạn.', data });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/social/blocks/:userId
    async blockUser(req, res, next) {
        try {
            await socialService.blockUser(req.user!.id, param(req, 'userId'));
            res.status(200).json({ status: 'success', message: 'Đã chặn người dùng.' });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/social/blocks/:userId
    async unblockUser(req, res, next) {
        try {
            await socialService.unblockUser(req.user!.id, param(req, 'userId'));
            res.status(200).json({ status: 'success', message: 'Đã bỏ chặn người dùng.' });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/social/summary
    async getSummary(req, res, next) {
        try {
            const data = await socialService.getSummary(req.user!.id);
            res.status(200).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    },

    // --------------------------------------------------------- CONVERSATIONS
    // GET /api/social/conversations
    async listConversations(req, res, next) {
        try {
            const data = await socialService.listConversations(req.user!.id);
            res.status(200).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/social/conversations   { friendId }
    async openConversation(req, res, next) {
        try {
            const data = await socialService.getOrCreateConversation(req.user!.id, req.body?.friendId);
            res.status(200).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/social/conversations/:conversationId/messages?cursor=&limit=
    async getMessages(req, res, next) {
        try {
            const data = await socialService.getMessages(
                req.user!.id,
                param(req, 'conversationId'),
                req.query.cursor,
                req.query.limit
            );
            res.status(200).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/social/conversations/:conversationId/messages   { content }
    // (Kênh dự phòng khi WebSocket không khả dụng; WebSocket dùng chung socialService.sendMessage)
    async sendMessage(req, res, next) {
        try {
            const data = await socialService.sendMessage(req.user!.id, param(req, 'conversationId'), req.body?.content);
            res.status(201).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/social/conversations/:conversationId/read
    async markRead(req, res, next) {
        try {
            const data = await socialService.markConversationRead(req.user!.id, param(req, 'conversationId'));
            res.status(200).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    },
};
