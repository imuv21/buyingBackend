import express from 'express';
import { signupValidator, loginValidator, forgotPasswordValidator, verifyPasswordOtpValidator, updateProfileValidator, addressValidator } from '../middlewares/validation.js';
import upload from '../middlewares/upload.js';
import authedUser from '../middlewares/authedUser.js';
import rateLimiter from '../middlewares/rateLimiter.js';
import userCont from '../controllers/userCont.js';
const router = express.Router();


// Public routes
router.post('/signup', rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }), signupValidator, userCont.userSignup);
router.post('/verify-otp', userCont.verifyOtp);
router.post('/login', loginValidator, userCont.userLogin);
router.post('/forgot-password', rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }), forgotPasswordValidator, userCont.forgotPassword);
router.post('/verify-password-otp', verifyPasswordOtpValidator, userCont.verifyPasswordOtp);

// Private routes
router.use(authedUser);
router.post('/add-address', addressValidator, userCont.addAddress);
router.patch('/edit-address', addressValidator, userCont.editAddress);
router.get('/get-address', userCont.getAddress);
router.delete('/delete-address/:addressId', userCont.deleteAddress);
router.patch('/update-profile', updateProfileValidator, userCont.updateProfile);
router.delete('/delete-user', userCont.deleteUser);
router.post('/add-review', upload.array('images', 2), userCont.addReview);
router.delete('/delete-review', userCont.deleteReview);

// router.post('/signup', rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }), upload.single('image'), signupValidator, userCont.userSignup);

export default router;