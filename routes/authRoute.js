import express from 'express';
import { signupValidator, loginValidator, forgotPasswordValidator, verifyPasswordOtpValidator, updateProfileValidator, addressValidator, addReviewValidator } from '../middlewares/validation.js';
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
router.post('/payment-verification', userCont.paymentVerification);

// For both
router.get('/get-category', userCont.getCategories);
router.get('/get-products', userCont.getProducts);
router.get('/get-product-details/:productId', userCont.getProductDetails);
router.get('/get-reviews/:productId', userCont.getReviews);
router.get('/get-order-details/:orderId', userCont.getOrderDetails);
router.get('/get-featured', userCont.getFeaturedProducts);

// Private routes
router.use(authedUser);
router.delete('/delete-user', userCont.deleteUser);
router.post('/add-address', addressValidator, userCont.addAddress);
router.patch('/edit-address', addressValidator, userCont.editAddress);
router.get('/get-address', userCont.getAddress);
router.delete('/delete-address/:addressId', userCont.deleteAddress);
router.patch('/update-profile', updateProfileValidator, userCont.updateProfile);
router.post('/add-review', addReviewValidator, userCont.addReview);
router.post('/add-to-cart', userCont.addToCart);
router.get('/get-cart', userCont.getCart);
router.put('/cart-quantity/:cartItemId', userCont.adjustCartQuantity);
router.delete('/remove-from-cart', userCont.removeFromCart);

router.get('/get-key', userCont.getKey);
router.post('/place-order', userCont.placeOrder);
router.get('/get-user-orders', userCont.getUserOrders);


// router.post('/signup', rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }), upload.single('image'), signupValidator, userCont.userSignup);

export default router;