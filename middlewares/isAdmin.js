

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        return next();
    }
    return res.status(403).json({ status: "failed", message: "Access denied. Admins only!" });
};
