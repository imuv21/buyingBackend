import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const authedUser = async (req, res, next) => {

    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ status: "failed", message: "Unauthorized user, no token provided!" });
    }
    const token = authorization.split(' ')[1];
    try {
        const { userID } = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = await User.findById(userID).select('-password');
        if (!req.user) {
            return res.status(401).json({ status: "failed", message: "Unauthorized user, user not found!" });
        }
        next();
    } catch (error) {
        return res.status(401).json({ status: "failed", message: "Unauthorized user, invalid token!" });
    }
};

export default authedUser;