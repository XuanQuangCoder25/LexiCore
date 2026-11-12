import cron from 'node-cron';

export const initKeepAliveCron = () => {
    // Xác định URL ping: ưu tiên biến môi trường, mặc định dùng domain chính thức
    const targetUrl =
        process.env.BACKEND_PING_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        (process.env.NODE_ENV === 'production' ? 'https://api.lexicore.site/health' : null);

    if (!targetUrl) {
        console.log('[Keep-Alive] Đang ở môi trường development (không cấu hình ping URL). Bỏ qua.');
        return;
    }

    console.log(`[Keep-Alive] Đã kích hoạt cronjob tự động ping mỗi 10 phút đến: ${targetUrl}`);

    // Lên lịch chạy mỗi 10 phút: '*/10 * * * *'
    cron.schedule('*/10 * * * *', async () => {
        try {
            const start = Date.now();
            const res = await fetch(targetUrl);
            const duration = Date.now() - start;
            console.log(`[Keep-Alive Ping] Ping thành công ${targetUrl} (Status: ${res.status}, ${duration}ms)`);
        } catch (err: any) {
            console.warn(`[Keep-Alive Ping] Lỗi khi ping ${targetUrl}:`, err?.message || err);
        }
    });
};

