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
router.get('/get-tags', isAdmin, userCont.getTags);
router.post('/add-category', isAdmin, upload.single('categoryImage'), userCont.addCategory);
router.delete('/delete-category/:categoryId', isAdmin, userCont.deleteCategory);
router.post('/add-product', isAdmin, upload.array('images', 5), addProductValidator, userCont.addProduct);
router.delete('/delete-product/:productId', isAdmin, userCont.deleteProduct);
router.delete('/delete-review', isAdmin, userCont.deleteReviewAdmin);

export default router;