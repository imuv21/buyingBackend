import express from 'express';
import { isAdmin } from '../middlewares/isAdmin.js';
import { addProductValidator } from '../middlewares/validation.js';
import authedUser from '../middlewares/authedUser.js';
import upload from '../middlewares/upload.js';
import userCont from '../controllers/userCont.js';
const router = express.Router();


// Admin routes
router.use(authedUser);
router.get('/get-users', isAdmin, userCont.getUsers);
router.get('/get-orders', isAdmin, userCont.getOrders);
router.patch('/update-order-status/:orderId', isAdmin, userCont.updateOrderStatus);
router.get('/get-tags', isAdmin, userCont.getTags);

router.post('/add-category', isAdmin, upload.single('categoryImage'), userCont.addCategory);
router.delete('/delete-category/:categoryId', isAdmin, userCont.deleteCategory);

router.post('/add-product', isAdmin, upload.array('images', 5), addProductValidator, userCont.addProduct);
router.put('/edit-product/:productId', isAdmin, upload.array('images', 5), addProductValidator, userCont.editProduct);
router.delete('/delete-product/:productId', isAdmin, userCont.deleteProduct);

router.put('/add-to-featured/:productId', isAdmin, userCont.addToFeaturedProducts);
router.delete('/remove-from-featured/:productId', isAdmin, userCont.removeFromFeaturedProducts);

router.get('/get-all-reviews', isAdmin, userCont.getReviewsAdmin);
router.delete('/delete-review/:productId/:reviewId', isAdmin, userCont.deleteReview);

export default router;