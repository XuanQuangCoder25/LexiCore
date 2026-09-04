import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL as string);

redis.on('connect', () => {
    console.log('Đã kết nối thành công với Redis!');
});

redis.on('error', (error) => {
    console.error('Lỗi kết nối Redis:', error);
});

export default redis;
