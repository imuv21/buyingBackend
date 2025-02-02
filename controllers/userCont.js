import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { validationResult } from "express-validator";
import { User, Product, Category, Tag } from '../models/User.js';
import sendMail from '../middlewares/sendMail.js';
import dotenv from 'dotenv';
dotenv.config();


//Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadPosters = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'Buying/Products' }, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result.secure_url);
        });
        stream.end(buffer);
    });
};

const uploadCatPosters = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'Buying/Categories' }, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result.secure_url);
        });
        stream.end(buffer);
    });
};


class userCont {

    //auth conts

    static userSignup = async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }
        try {
            const { email, role, password } = req.body;
            const userExists = await User.findOne({ email, role });
            if (userExists) {
                return res.status(400).json({ status: "failed", message: `User already exists!` });
            }

            const salt = await bcrypt.genSalt(10);
            const hashPassword = await bcrypt.hash(password, salt);
            const otp = crypto.randomInt(100000, 999999).toString(); // Generate 6-digit OTP
            const otpExpiry = Date.now() + 2 * 60 * 1000; // OTP valid for 2 minutes
            const newUser = new User({ firstName: "Tyrion", lastName: "Lannister", email, role, password: hashPassword, otp, otpExpiry });
            await newUser.save();

            setTimeout(async () => {
                const user = await User.findOne({ email: newUser.email, role: newUser.role });
                if (user && user.isVerified !== 1) {
                    await User.deleteOne({ _id: user._id });
                }
            }, 2 * 60 * 1000);

            const msg = `
                <div style="font-family: 'Roboto', sans-serif; width: 100%;">
                    <div style="background: #5AB2FF; padding: 10px 20px; border-radius: 3px; border: none">
                        <a href="#" style="font-size:1.6em; color: white; text-decoration:none; font-weight:600">Buying</a>
                    </div>
                    <p>Hello there!</p>
                    <p>Thank you for choosing Buying. Use the following OTP to complete your sign-up procedure. This OTP is valid for 2 minutes.</p>
                    <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                        <div style="background: #5AB2FF; color: white; width: fit-content; border-radius: 3px; padding: 5px 10px; font-size: 1.4em;">${otp}</div>
                    </div>
                    <p>Regards,</p>
                    <p>Buying</p>
                </div>`;

            await sendMail(newUser.email, 'Verify your account', msg);
            return res.status(201).json({ status: "success", message: `Please verify your account using the OTP sent to ${newUser.email}` });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static verifyOtp = async (req, res) => {
        try {
            const { email, role, otp } = req.body;

            if (!otp) {
                return res.status(400).json({ status: "failed", message: "OTP is required!" });
            }
            const user = await User.findOne({ email, role });
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User with this role doesn't exist!" });
            }
            if (user.otp !== otp) {
                return res.status(400).json({ status: "failed", message: "Invalid OTP!" });
            }
            if (Date.now() > user.otpExpiry) {
                return res.status(400).json({ status: "failed", message: "OTP expired!" });
            }
            await User.updateOne({ email, role },
                {
                    $unset: { otp: "", otpExpiry: "" },
                    $set: { isVerified: 1 }
                }
            );

            return res.status(200).json({ status: "success", message: "Email verified successfully. Please login now." });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static deleteUser = async (req, res) => {
        try {
            const userId = req.user._id;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }

            await User.deleteOne({ _id: user._id });
            return res.status(200).json({ status: "success", message: "User deleted successfully." });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static userLogin = async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }
        try {
            const { email, password, role } = req.body;
            const user = await User.findOne({ email, role });
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User with this role doesn't exist!" });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ status: "failed", message: "Email or password is incorrect!" });
            }
            const token = jwt.sign({ userID: user._id, role: user.role }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
            const userResponse = {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified
            };
            return res.status(200).json({ status: "success", message: "User logged in successfully.", token, user: userResponse });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static forgotPassword = async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }
        try {
            const { email, role } = req.body;
            const user = await User.findOne({ email, role });
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User with this role doesn't exist!" });
            }

            const otp = crypto.randomInt(100000, 999999).toString(); // Generate 6-digit OTP
            const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
            await User.updateOne({ email, role },
                { $set: { otp, otpExpiry } }
            );

            const msg = `
                <div style="font-family: 'Roboto', sans-serif; width: 100%;">
                    <div style="background: #5AB2FF; padding: 10px 20px; border-radius: 3px; border: none">
                        <a href="#" style="font-size:1.6em; color: white; text-decoration:none; font-weight:600">Buying</a>
                    </div>
                    <p>Hello there!</p>
                    <p>Use the following OTP to reset your password. This OTP is valid for 10 minutes.</p>
                    <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                        <div style="background: #5AB2FF; color: white; width: fit-content; border-radius: 3px; padding: 5px 10px; font-size: 1.4em;">${otp}</div>
                    </div>
                    <p>Regards,</p>
                    <p>Buying</p>
                </div>`;

            await sendMail(user.email, 'Reset Your Password', msg);
            return res.status(200).json({ status: "success", message: `OTP sent to ${user.email}.` });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static verifyPasswordOtp = async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }
        try {
            const { email, role, otp, newPassword } = req.body;
            const user = await User.findOne({ email, role });
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User with this role doesn't exist!" });
            }
            if (user.otp !== otp) {
                return res.status(400).json({ status: "failed", message: "Invalid OTP!" });
            }
            if (Date.now() > user.otpExpiry) {
                return res.status(400).json({ status: "failed", message: "OTP expired!" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashPassword = await bcrypt.hash(newPassword, salt);

            await User.updateOne({ email, role },
                {
                    $set: { password: hashPassword },
                    $unset: { otp: "", otpExpiry: "" }
                }
            );
            return res.status(200).json({ status: "success", message: "Password updated successfully." });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static updateProfile = async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }
        try {
            const { firstName, lastName } = req.body;
            const userId = req.user._id;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }

            user.firstName = firstName || user.firstName;
            user.lastName = lastName || user.lastName;
            await user.save();
            return res.status(200).json({ status: "success", message: "Profile updated successfully.", profile: { firstName: user.firstName, lastName: user.lastName } });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    }

    static addAddress = async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }
        try {
            const userId = req.user._id;
            const { address, city, landmark, pincode, number, isDefault } = req.body;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }
            if (isDefault) {
                user.addresses.forEach((addr) => {
                    addr.isDefault = false;
                });
            }
            user.addresses.push({ address, city, landmark, pincode, number, isDefault: !!isDefault });
            await user.save();

            return res.status(200).json({ status: "success", message: "Address added successfully!", addresses: user.addresses });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    }

    static editAddress = async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }
        try {
            const userId = req.user._id;
            const { addressId, address, city, landmark, pincode, number, isDefault } = req.body;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }
            const existingAddress = user.addresses.id(addressId);
            if (!existingAddress) {
                return res.status(404).json({ status: "failed", message: "Address not found!" });
            }
            if (isDefault) {
                user.addresses.forEach((addr) => {
                    addr.isDefault = false;
                });
            }

            existingAddress.address = address || existingAddress.address;
            existingAddress.city = city || existingAddress.city;
            existingAddress.landmark = landmark || existingAddress.landmark;
            existingAddress.pincode = pincode || existingAddress.pincode;
            existingAddress.number = number || existingAddress.number;
            existingAddress.isDefault = !!isDefault;
            await user.save();

            return res.status(200).json({ status: "success", message: "Address updated successfully!", addresses: user.addresses });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static getAddress = async (req, res) => {
        try {
            const userId = req.user._id;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }
            return res.status(200).json({ status: "success", message: "Addresses fetched successfully!", addresses: user.addresses });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    }

    static deleteAddress = async (req, res) => {
        try {
            const userId = req.user._id;
            const { addressId } = req.params;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }
            const addressIndex = user.addresses.findIndex(
                (address) => address._id.toString() === addressId
            );
            if (addressIndex === -1) {
                return res.status(404).json({ status: "failed", message: "Address not found!" });
            }
            user.addresses.splice(addressIndex, 1);
            await user.save();

            return res.status(200).json({ status: "success", message: "Address deleted successfully!", addresses: user.addresses });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static addReview = async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }
        try {
            const { productId, reviewText, rating } = req.body;
            const userId = req.user.id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }
            if (!productId) {
                return res.status(400).json({ status: "failed", message: "Product Id not found!" });
            }
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ status: "failed", message: "Product not found!" });
            }
            // const existingReview = product.reviews.find((review) => review.userId.toString() === userId);
            // if (existingReview) {
            //     return res.status(403).json({ status: "failed", message: "You have already reviewed this product!" });
            // }

            const newReview = { review: reviewText, rating: rating, userId };
            product.reviews.push(newReview);
            switch (rating) {
                case 1: product.oneStar += 1; break;
                case 2: product.twoStar += 1; break;
                case 3: product.threeStar += 1; break;
                case 4: product.fourStar += 1; break;
                case 5: product.fiveStar += 1; break;
                default: break;
            }

            const totalRatings = product.oneStar + product.twoStar + product.threeStar + product.fourStar + product.fiveStar;
            const totalScore = product.oneStar * 1 + product.twoStar * 2 + product.threeStar * 3 + product.fourStar * 4 + product.fiveStar * 5;
            product.averageRating = totalRatings > 0 ? parseFloat((totalScore / totalRatings).toFixed(1)) : 0;
            await product.save();
            return res.status(201).json({ status: "success", message: "Review added successfully." });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static getReviews = async (req, res) => {
        try {
            const { productId } = req.params;
            let { page = 1, size = 10, sortBy = "createdAt", order = "desc" } = req.query;
            page = Math.max(1, parseInt(page));
            size = Math.max(1, parseInt(size));

            if (!productId) {
                return res.status(400).json({ status: "failed", message: "Product Id not found!" });
            }
            const product = await Product.findById(productId).select('reviews').populate({
                path: 'reviews.userId',
                select: 'firstName lastName'
            });
            if (!product) {
                return res.status(404).json({ status: "failed", message: "Product not found!" });
            }

            const sortOptions = {};
            const sortField = sortBy === 'rating' ? 'rating' : 'createdAt';
            sortOptions[sortField] = order.toLowerCase() === 'asc' ? 1 : -1;
            const sortedReviews = product.reviews.sort((a, b) => {
                if (sortField === 'createdAt') {
                    return order === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
                }
                return order === 'asc' ? a.rating - b.rating : b.rating - a.rating;
            });
            const skip = (page - 1) * size;
            const paginatedReviews = sortedReviews.slice(skip, skip + size);

            const totalReviews = product.reviews.length;
            const totalPages = Math.ceil(totalReviews / size);
            const pageReviews =  paginatedReviews.length;
            const isFirst = page === 1;
            const isLast = page === totalPages || totalPages === 0;
            const hasNext = page < totalPages;
            const hasPrevious = page > 1;

            const reviewsWithUserInfo = paginatedReviews.map(review => ({
                review: review.review,
                rating: review.rating,
                createdAt: review.createdAt,
                firstName: review.userId?.firstName || "Unknown",
                lastName: review.userId?.lastName || "Unknown",
                id: review._id
            }));

            return res.status(200).json({ status: "success", reviews: reviewsWithUserInfo, totalReviews, totalPages, pageReviews, isFirst, isLast, hasNext, hasPrevious });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static deleteReviewAdmin = async (req, res) => {
        try {
            const { productId, reviewId, userId } = req.body;

            if (!productId || !reviewId || !userId) {
                return res.status(400).json({ status: "failed", message: "Product Id, Review Id and User Id are required!" });
            }
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ status: "failed", message: "Product not found!" });
            }
            const reviewIndex = product.reviews.findIndex(
                (review) => review._id.toString() === reviewId && review.userId.toString() === userId
            );
            if (reviewIndex === -1) {
                return res.status(403).json({ status: "failed", message: "Review not found or does not belong to the user!" });
            }

            const reviewToDelete = product.reviews[reviewIndex];

            product.reviews.splice(reviewIndex, 1);
            switch (reviewToDelete.rating) {
                case 1:
                    product.oneStar -= 1;
                    break;
                case 2:
                    product.twoStar -= 1;
                    break;
                case 3:
                    product.threeStar -= 1;
                    break;
                case 4:
                    product.fourStar -= 1;
                    break;
                case 5:
                    product.fiveStar -= 1;
                    break;
                default:
                    break;
            }

            const totalRatings = product.oneStar + product.twoStar + product.threeStar + product.fourStar + product.fiveStar;
            const totalScore = product.oneStar * 1 + product.twoStar * 2 + product.threeStar * 3 + product.fourStar * 4 + product.fiveStar * 5;
            product.averageRating = totalRatings > 0 ? parseFloat((totalScore / totalRatings).toFixed(1)) : 0;
            await product.save();

            return res.status(200).json({ status: "success", message: "Review deleted successfully." });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };


    //admin category & tag conts

    static addCategory = async (req, res) => {
        try {
            const { categoryName } = req.body;
            if (!categoryName) {
                return res.status(400).json({ status: "failed", message: "Category name is required!" });
            }
            if (!req.file) {
                return res.status(400).json({ status: "failed", message: "Category image is required!" });
            }
            let uploadedImageUrl = null;
            if (req.file) {
                try {
                    uploadedImageUrl = await uploadCatPosters(req.file.buffer);
                } catch (uploadError) {
                    return res.status(500).json({ status: "failed", message: "Image upload failed!" });
                }
            }
            const newCategory = new Category({ categoryName, categoryImage: uploadedImageUrl });
            await newCategory.save();

            return res.status(201).json({ status: "success", message: "Category added successfully." });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static deleteCategory = async (req, res) => {
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                return res.status(400).json({ status: "failed", message: "Category ID is required!" });
            }
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).json({ status: "failed", message: "Category not found!" });
            }

            if (category.categoryImage) {
                const publicId = category.categoryImage.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`Buying/Categories/${publicId}`);
            }
            await Category.findByIdAndDelete(categoryId);

            return res.status(200).json({ status: "success", message: "Category deleted successfully." });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static getCategories = async (req, res) => {
        try {
            const categories = await Category.find();
            if (categories.length === 0) {
                return res.status(404).json({ status: "failed", message: "No categories found!" });
            }

            return res.status(200).json({ status: "success", categories });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static getTags = async (req, res) => {
        try {
            const searchQuery = req.query.search || '';
            const regex = new RegExp(searchQuery, 'i');
            const tags = await Tag.find({ tagName: { $regex: regex } }).limit(25).exec();

            return res.status(200).json({ status: 'success', tags });

        } catch (error) {
            return res.status(500).json({ status: 'failed', message: 'Server error, Please try again later!' });
        }
    };


    //admin product conts

    static addProduct = async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }
        try {
            const { tags, title, category, originalPrice, salePrice, stocks, information } = req.body;

            if (!req.files || req.files.length < 2) {
                return res.status(400).json({ status: "failed", message: "At least 2 images are required!" });
            }
            const imageUploadPromises = req.files.map((file) => uploadPosters(file.buffer));
            const uploadedImageUrls = await Promise.all(imageUploadPromises);

            const existingTags = await Tag.find({ tagName: { $in: tags } });
            const existingTagNames = existingTags.map(tag => tag.tagName);
            const newTagNames = tags.filter(tag => !existingTagNames.includes(tag));
            const newTags = newTagNames.map(tag => new Tag({ tagName: tag }));
            if (newTags.length > 0) {
                await Tag.insertMany(newTags);
            }

            const inStock = stocks > 0;
            const newProduct = new Product({ tags: [...existingTagNames, ...newTagNames], title, category, originalPrice, salePrice, stocks, inStock, information, images: uploadedImageUrls });
            await newProduct.save();

            return res.status(201).json({ status: "success", message: "Product added successfully." });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static getProducts = async (req, res) => {
        try {
            let { page = 1, size = 10, search = "", category = "", sortBy = "salePrice", order = "asc" } = req.query;
            page = Math.max(1, parseInt(page));
            size = Math.max(1, parseInt(size));

            const filter = {};
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } },
                    { tags: { $regex: search, $options: "i" } }
                ];
            }
            if (category) {
                filter.category = category;
            }
            const sortOptions = {
                "salePrice": { salePrice: order === "asc" ? 1 : -1 },
                "title": { title: order === "asc" ? 1 : -1 },
                "averageRating": { averageRating: order === "asc" ? 1 : -1 }
            };
            const sortCriteria = sortOptions[sortBy] || { salePrice: 1 };

            const totalProducts = await Product.countDocuments(filter);
            const products = await Product.find(filter)
                .select('_id title originalPrice salePrice inStock averageRating images')
                .skip((page - 1) * size).limit(size).sort(sortCriteria).lean().exec();

            const transformedProducts = products.map(product => ({
                ...product,
                images: product.images.slice(0, 2)
            }));

            const totalPages = Math.ceil(totalProducts / size);
            const pageProducts = transformedProducts.length;
            const isFirst = page === 1;
            const isLast = page === totalPages || totalPages === 0;
            const hasNext = page < totalPages;
            const hasPrevious = page > 1;

            return res.status(200).json({ status: "success", products: transformedProducts, totalProducts, totalPages, pageProducts, isFirst, isLast, hasNext, hasPrevious });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static deleteProduct = async (req, res) => {
        try {
            const { productId } = req.params;
            if (!productId) {
                return res.status(400).json({ status: "failed", message: "Product ID is required!" });
            }
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ status: "failed", message: "Product not found!" });
            }

            const deleteImagePromises = product.images.map((imageUrl) => {
                const publicId = imageUrl.split("/").pop().split(".")[0];
                return cloudinary.uploader.destroy(`Buying/Products/${publicId}`);
            });
            await Promise.all(deleteImagePromises);

            const reviewImageDeletePromises = product.reviews.flatMap((review) =>
                review.images.map((imageUrl) => {
                    const publicId = imageUrl.split("/").pop().split(".")[0];
                    return cloudinary.uploader.destroy(`Buying/Reviews/${publicId}`);
                })
            );
            await Promise.all(reviewImageDeletePromises);

            const userUpdatePromises = product.reviews.map((review) =>
                User.findByIdAndUpdate(review.userId, {
                    $pull: {
                        reviewedProducts: { productId },
                    },
                })
            );
            await Promise.all(userUpdatePromises);
            await Product.findByIdAndDelete(productId);

            return res.status(200).json({ status: "success", message: "Product and associated reviews deleted successfully." });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static getProductDetails = async (req, res) => {
        try {
            const { productId } = req.params;
            if (!productId) {
                return res.status(400).json({ status: "failed", message: "Product Id is required!" });
            }
            const productDetails = await Product.findById(productId).select("-reviews");
            if (!productDetails) {
                return res.status(404).json({ status: "failed", message: "Product not found!" });
            }
            return res.status(200).json({ status: "success", productDetails });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

}

export default userCont;