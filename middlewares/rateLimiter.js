import rateLimit from 'express-rate-limit';

const rateLimiter = ({ windowMs, max }) => {
    return rateLimit({
        windowMs: windowMs || 15 * 60 * 1000, // 15 minutes
        max: max || 300, // 300 requests per window
        message: { status: "failed", message: "Too many requests. Please try again later!" },
        headers: true,
    });
};

export default rateLimiter;
