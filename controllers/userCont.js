import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { v2 as cloudinary } from 'cloudinary';
import { validationResult } from "express-validator";
import { User, Product, Category, Tag, Order } from '../models/User.js';
import sendMail from '../middlewares/sendMail.js';
import dotenv from 'dotenv';
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;

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

//Razorpay
const instance = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
});

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


    //address

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


    //reviews

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
            const pageReviews = paginatedReviews.length;
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

    static getReviewsAdmin = async (req, res) => {
        try {
            let { page = 1, size = 10, sortBy = "createdAt", order = "desc" } = req.query;
            page = Math.max(1, parseInt(page));
            size = Math.max(1, parseInt(size));

            const sortOptions = {
                "createdAt": { createdAt: order === "asc" ? 1 : -1 },
                "rating": { rating: order === "asc" ? 1 : -1 }
            };
            const sortCriteria = sortOptions[sortBy] || { createdAt: -1 };

            const aggregationPipeline = [
                { $unwind: "$reviews" },
                {
                    $facet: {
                        metadata: [{ $count: "total" }],
                        data: [
                            {
                                $project: {
                                    reviewId: "$reviews._id",
                                    productTitle: "$title",
                                    review: "$reviews.review",
                                    rating: "$reviews.rating",
                                    userId: "$reviews.userId",
                                    createdAt: "$reviews.createdAt"
                                }
                            },
                            { $sort: sortCriteria },
                            { $skip: (page - 1) * size },
                            { $limit: size }
                        ]
                    }
                },
                {
                    $project: {
                        totalReviews: { $ifNull: [{ $arrayElemAt: ["$metadata.total", 0] }, 0] },
                        reviews: "$data"
                    }
                }
            ];

            const result = await Product.aggregate(aggregationPipeline);
            const { totalReviews, reviews } = result[0] || { totalReviews: 0, reviews: [] };

            const totalPages = Math.ceil(totalReviews / size);
            const pageReviews = reviews.length;
            const isFirst = page === 1;
            const isLast = page === totalPages || totalPages === 0;
            const hasNext = page < totalPages;
            const hasPrevious = page > 1;

            return res.status(200).json({ status: "success", reviews, totalReviews, totalPages, pageReviews, isFirst, isLast, hasNext, hasPrevious });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static deleteReview = async (req, res) => {
        try {
            const { productId, reviewId } = req.params;

            const result = await Product.updateOne(
                { _id: productId, "reviews._id": reviewId },
                { $pull: { reviews: { _id: reviewId } } }
            );
            if (result.modifiedCount === 0) {
                return res.status(404).json({ status: "failed", message: "Review not found!" });
            }

            return res.status(200).json({ status: "success", message: "Review deleted successfully." });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
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
            let { page = 1, size = 10, sortBy = "categoryName", order = "desc" } = req.query;
            page = Math.max(1, parseInt(page));
            size = Math.max(1, parseInt(size));

            const sortOptions = {
                "categoryName": { categoryName: order === "asc" ? 1 : -1 },
            };
            const sortCriteria = sortOptions[sortBy] || { categoryName: -1 };

            const totalCategories = await Category.countDocuments();
            const categories = await Category.find().skip((page - 1) * size).limit(size).sort(sortCriteria).lean().exec();

            if (categories.length === 0) {
                return res.status(404).json({ status: "failed", message: "No categories found!" });
            }

            const totalPages = Math.ceil(totalCategories / size);
            const pageCategories = categories.length;
            const isFirst = page === 1;
            const isLast = page === totalPages || totalPages === 0;
            const hasNext = page < totalPages;
            const hasPrevious = page > 1;

            return res.status(200).json({ status: "success", categories, totalCategories, totalPages, pageCategories, isFirst, isLast, hasNext, hasPrevious });

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
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };


    //product conts

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

    static editProduct = async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: "failed", errors: errors.array() });
        }

        try {
            const { productId } = req.params;
            const { tags, title, category, originalPrice, salePrice, stocks, information } = req.body;

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ status: "failed", message: "Product not found!" });
            }

            const updateFields = {};
            if (title && title !== product.title) {
                updateFields.title = title;
            }
            if (category && category !== product.category) {
                updateFields.category = category;
            }
            if (originalPrice && Number(originalPrice) !== product.originalPrice) {
                updateFields.originalPrice = originalPrice;
            }
            if (salePrice && Number(salePrice) !== product.salePrice) {
                updateFields.salePrice = salePrice;
            }
            if (information && information !== product.information) {
                updateFields.information = information;
            }
            if (stocks !== undefined && Number(stocks) !== product.stocks) {
                updateFields.stocks = stocks;
                updateFields.inStock = Number(stocks) > 0;
            }

            if (tags) {
                const newTags = tags;
                const existingTags = await Tag.find({ tagName: { $in: newTags } });
                const existingTagNames = existingTags.map((tag) => tag.tagName);
                const newTagNames = newTags.filter((tag) => !existingTagNames.includes(tag));
                if (newTagNames.length > 0) {
                    const tagsToInsert = newTagNames.map((tag) => new Tag({ tagName: tag }));
                    await Tag.insertMany(tagsToInsert);
                }
                updateFields.tags = [...existingTagNames, ...newTagNames];
            }

            if (req.body.imagesToRemove && Array.isArray(req.body.imagesToRemove)) {
                product.images = product.images.filter(img => !req.body.imagesToRemove.includes(img));
                const deleteImagePromises = req.body.imagesToRemove.map((imageUrl) => {
                    const publicId = imageUrl.split("/").pop().split(".")[0];
                    return cloudinary.uploader.destroy(`Buying/Products/${publicId}`);
                });
                await Promise.all(deleteImagePromises);
            }
            if (req.files && req.files.length > 0) {
                const imageUploadPromises = req.files.map((file) => uploadPosters(file.buffer));
                const uploadedImageUrls = await Promise.all(imageUploadPromises);
                updateFields.images = [...product.images, ...uploadedImageUrls];
            }

            const updatedProduct = await Product.findByIdAndUpdate(productId,
                { $set: updateFields },
                { new: true }
            );

            return res.status(200).json({ status: "success", message: "Product updated successfully.", data: updatedProduct });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
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
                "averageRating": { averageRating: order === "asc" ? 1 : -1 },
                "boughtCounter": { boughtCounter: order === "asc" ? 1 : -1 }
            };
            const sortCriteria = sortOptions[sortBy] || { salePrice: 1 };

            const totalProducts = await Product.countDocuments(filter);
            const products = await Product.find(filter)
                .select('_id title originalPrice salePrice stocks averageRating boughtCounter images isFeatured')
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
            await Product.findByIdAndDelete(productId);

            return res.status(200).json({ status: "success", message: "Product deleted successfully." });

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

    //featured product conts

    static addToFeaturedProducts = async (req, res) => {
        try {
            const { productId } = req.params;
            if (!productId) {
                return res.status(400).json({ status: "failed", message: "Product ID is required!" });
            }
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ status: "failed", message: "Product not found!" });
            }
            if (product.isFeatured) {
                return res.status(400).json({ status: "failed", message: "Product is already featured!" });
            }
            product.isFeatured = true;
            await product.save();

            return res.status(200).json({ status: "success", message: "Product added to featured products." });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static removeFromFeaturedProducts = async (req, res) => {
        try {
            const { productId } = req.params;
            if (!productId) {
                return res.status(400).json({ status: "failed", message: "Product ID is required!" });
            }
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ status: "failed", message: "Product not found!" });
            }
            if (!product.isFeatured) {
                return res.status(400).json({ status: "failed", message: "Product is not featured!" });
            }
            product.isFeatured = false;
            await product.save();

            return res.status(200).json({ status: "success", message: "Product removed from featured products." });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static getFeaturedProducts = async (req, res) => {
        try {
            let { page = 1, size = 10, sortBy = "salePrice", order = "asc" } = req.query;
            page = Math.max(1, parseInt(page));
            size = Math.max(1, parseInt(size));

            const filter = { isFeatured: true };
            const sortOptions = {
                "salePrice": { salePrice: order === "asc" ? 1 : -1 },
                "title": { title: order === "asc" ? 1 : -1 },
                "averageRating": { averageRating: order === "asc" ? 1 : -1 }
            };
            const sortCriteria = sortOptions[sortBy] || { salePrice: 1 };

            const totalProducts = await Product.countDocuments(filter);
            const products = await Product.find(filter)
                .select('_id title originalPrice salePrice stocks averageRating images')
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


    //cart conts

    static addToCart = async (req, res) => {
        try {
            const { productId, quantity, color, size } = req.body;
            const userId = req.user._id;

            if (!productId || !quantity) {
                return res.status(400).json({ status: "failed", message: "Something went wrong!" });
            }
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ status: "failed", message: "Product not found!" });
            }
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }
            const currentTotal = user.cart.reduce((total, item) => total + item.quantity, 0);
            if (currentTotal + quantity > 40) {
                return res.status(400).json({ status: "failed", message: "Your cart is full!" });
            }
            let addMsg = null;
            if (quantity > 1) {
                addMsg = `${quantity} products added to cart!`;
            } else {
                addMsg = `${quantity} product added to cart!`;
            }
            const existingItem = user.cart.find(
                item => item.productId.toString() === productId && item.color === color && item.size === size
            );
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                user.cart.push({ productId, quantity, color, size });
            }
            await user.save();
            const totalQuantity = user.cart.reduce((total, item) => total + item.quantity, 0);

            return res.status(200).json({ status: "success", message: addMsg, totalQuantity });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static getCart = async (req, res) => {
        try {
            const userId = req.user._id;
            const user = await User.findById(userId).populate("cart.productId", "title salePrice stocks images");
            if (!user || user.cart.length === 0) {
                return res.status(200).json({ status: "success", message: "Cart is empty!", cart: [] });
            }
            let totalQuantity = 0;
            const formattedCart = user.cart.map(item => {
                totalQuantity += item.quantity;
                return {
                    _id: item._id,
                    productId: item.productId ? item.productId._id : null,
                    title: item.productId ? item.productId.title : "Unknown Product",
                    salePrice: item.productId ? item.productId.salePrice : 0,
                    stocks: item.productId ? item.productId.stocks : 0,
                    image: item.productId && item.productId.images && item.productId.images.length > 0 ? item.productId.images[0] : null,
                    quantity: item.quantity,
                    color: item.color,
                    size: item.size,
                };
            });

            return res.status(200).json({ status: "success", cart: formattedCart, totalQuantity });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static adjustCartQuantity = async (req, res) => {
        try {
            const { cartItemId } = req.params;
            const { action } = req.body;
            const userId = req.user._id;

            if (!['increase', 'decrease'].includes(action)) {
                return res.status(400).json({ status: "failed", message: "Invalid action! Use 'increase' or 'decrease'!" });
            }
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }
            const cartItem = user.cart.id(cartItemId);
            if (!cartItem) {
                return res.status(404).json({ status: "failed", message: "Cart item not found!" });
            }
            const currentTotal = user.cart.reduce((total, item) => total + item.quantity, 0);
            if (currentTotal >= 40) {
                return res.status(400).json({ status: "failed", message: "Your cart is full!" });
            }
            if (action === 'increase') {
                cartItem.quantity += 1;
            } else {
                cartItem.quantity = Math.max(1, cartItem.quantity - 1);
            }

            await user.save();

            const updatedUser = await User.findById(userId).populate("cart.productId", "title salePrice stocks images");
            let totalQuantity = 0;
            const formattedCart = updatedUser.cart.map(item => {
                totalQuantity += item.quantity;
                return {
                    _id: item._id,
                    productId: item.productId ? item.productId._id : null,
                    title: item.productId ? item.productId.title : "Unknown Product",
                    salePrice: item.productId ? item.productId.salePrice : 0,
                    stocks: item.productId ? item.productId.stocks : 0,
                    image: item.productId && item.productId.images && item.productId.images.length > 0 ? item.productId.images[0] : null,
                    quantity: item.quantity,
                    color: item.color,
                    size: item.size,
                };
            });

            return res.status(200).json({ status: "success", cart: formattedCart, totalQuantity });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static removeFromCart = async (req, res) => {
        try {
            const { productId, color, size } = req.body;
            const userId = req.user._id;
            if (!productId || !color || !size) {
                return res.status(400).json({ status: "failed", message: "Something went wrong!" });
            }
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }
            const cartItemIndex = user.cart.findIndex(item =>
                item.productId.toString() === productId &&
                item.color === color &&
                item.size === size
            );
            if (cartItemIndex === -1) {
                return res.status(404).json({ status: "failed", message: "Cart item not found!" });
            }
            user.cart.splice(cartItemIndex, 1);
            await user.save();

            const updatedUser = await User.findById(userId).populate("cart.productId", "title salePrice stocks images");
            let totalQuantity = 0;
            const formattedCart = updatedUser.cart.map(item => {
                totalQuantity += item.quantity;
                return {
                    _id: item._id,
                    productId: item.productId ? item.productId._id : null,
                    title: item.productId ? item.productId.title : "Unknown Product",
                    salePrice: item.productId ? item.productId.salePrice : 0,
                    stocks: item.productId ? item.productId.stocks : 0,
                    image: item.productId && item.productId.images && item.productId.images.length > 0 ? item.productId.images[0] : null,
                    quantity: item.quantity,
                    color: item.color,
                    size: item.size,
                };
            });

            return res.status(200).json({ status: "success", message: "Product removed from cart.", cart: formattedCart, totalQuantity });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };


    //payment & order conts

    static getKey = async (req, res) => {
        return res.status(200).json({ key: process.env.RAZORPAY_API_KEY });
    };

    static placeOrder = async (req, res) => {

        const { addressId, paymentMethod } = req.body;
        try {
            const userId = req.user._id;
            const user = await User.findById(userId).populate("cart.productId", "title salePrice images");
            if (!user || !user.cart.length) {
                return res.status(400).json({ status: "failed", message: "Cart is empty!" });
            }
            const address = user.addresses.id(addressId);
            if (!address) {
                return res.status(400).json({ status: "failed", message: "Invalid address id provided!" });
            }
            if (!paymentMethod) {
                return res.status(400).json({ status: "failed", message: "Payment method is required!" });
            }
            const pm = paymentMethod && typeof paymentMethod === "string" ? paymentMethod.toLowerCase() : "";
            if (!pm || (pm !== "online" && pm !== "cod")) {
                return res.status(400).json({ status: "failed", message: "Invalid payment method provided!" });
            }

            const items = user.cart.map(item => ({
                productId: item.productId ? item.productId._id : null,
                title: item.productId ? item.productId.title : "Unknown Product",
                salePrice: item.productId ? item.productId.salePrice : 0,
                quantity: item.quantity,
                color: item.color,
                size: item.size,
                image: item.productId && item.productId.images && item.productId.images.length > 0 ? item.productId.images[0] : null,
            }));

            const baseAmount = items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
            if (!baseAmount || baseAmount <= 0) {
                return res.status(400).json({ status: "failed", message: "Invalid total amount!" });
            }
            const shippingCharge = 60;
            const totalAmount = baseAmount + shippingCharge;

            if (pm === "online") {
                const options = {
                    amount: Math.round(totalAmount * 100),
                    currency: 'INR'
                };
                const payment = await instance.orders.create(options);
                if (payment) {
                    const newOrder = new Order({ userId, items, totalAmount, address, status: "Created", paymentMethod: pm });
                    await newOrder.save();

                    return res.status(200).json({ status: "success", message: "Order created. Awaiting payment...", payment });
                } else {
                    return res.status(400).json({ status: "failed", message: "Order creation failed!" });
                }
            } else {
                const newOrder = new Order({ userId, items, totalAmount, address, status: "Placed", paymentMethod: pm });

                for (const item of newOrder.items) {
                    const product = await Product.findById(item.productId);
                    if (product) {
                        product.stocks -= item.quantity;
                        if (product.stocks < 0) {
                            product.stocks = 0;
                        }
                        product.inStock = product.stocks > 0;
                        product.boughtCounter += item.quantity;
                        await product.save();
                    }
                }
                await newOrder.save();
                await User.findByIdAndUpdate(userId, { cart: [] });

                return res.status(200).json({ status: "success", message: "Your order has been placed successfully." });
            }
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static paymentVerification = async (req, res) => {
        try {
            const { userId } = req.query;
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ status: "failed", message: "Razorpay credentials are missing!" });
            }
            if (!userId) {
                return res.status(401).json({ status: "failed", message: "Unauthorized user, no token provided!" });
            }

            const body = `${razorpay_order_id}|${razorpay_payment_id}`;
            const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_API_SECRET).update(body).digest('hex');
            const isAuthentic = expectedSignature === razorpay_signature;
            if (isAuthentic) {
                const order = await Order.findOne({ userId, status: "Created" });
                if (!order) {
                    return res.status(404).json({ status: "failed", message: "Order not found!" });
                }

                for (const item of order.items) {
                    const product = await Product.findById(item.productId);
                    if (product) {
                        product.stocks -= item.quantity;
                        if (product.stocks < 0) {
                            product.stocks = 0;
                        }
                        product.inStock = product.stocks > 0;
                        product.boughtCounter += item.quantity;

                        await product.save();
                    }
                }
                order.status = "Placed";
                await order.save();
                await User.findByIdAndUpdate(userId, { cart: [] });

                return res.redirect(`${FRONTEND_URL}/payment-success?reference=${razorpay_payment_id}`);
            } else {
                return res.status(400).json({ status: "failed", message: "Payment verification failed!" });
            }
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!", error: error.message });
        }
    };

    static getUserOrders = async (req, res) => {
        try {
            let { page = 1, size = 10, status, sortBy = "orderDate", order = "desc" } = req.query;
            page = Math.max(1, parseInt(page));
            size = Math.max(1, parseInt(size));

            const filter = { userId: req.user._id };
            if (status) {
                filter.status = status;
            } else {
                filter.status = { $ne: "Created" };
            }
            const sortOptions = {
                totalAmount: { totalAmount: order === "asc" ? 1 : -1 },
                orderDate: { orderDate: order === "asc" ? 1 : -1 }
            };
            const sortCriteria = sortOptions[sortBy] || { orderDate: -1 };

            const totalOrders = await Order.countDocuments(filter);
            const ordersRaw = await Order.find(filter).select('-userId -address -__v')
                .skip((page - 1) * size).limit(size).sort(sortCriteria).lean().exec();
            const orders = ordersRaw.map(order => {
                const { items, ...rest } = order;
                const itemsCount = items.reduce((total, item) => total + item.quantity, 0);
                return { ...rest, itemsCount };
            });

            const totalPages = Math.ceil(totalOrders / size);
            const pageOrders = orders.length;
            const isFirst = page === 1;
            const isLast = page === totalPages || totalPages === 0;
            const hasNext = page < totalPages;
            const hasPrevious = page > 1;

            return res.status(200).json({ status: "success", orders, totalOrders, totalPages, pageOrders, isFirst, isLast, hasNext, hasPrevious });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    }

    static cancelOrder = async (req, res) => {
        try {
            const { orderId } = req.params;
            if (!orderId) {
                return res.status(400).json({ status: "failed", message: "Order id is required!" });
            }
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ status: "failed", message: "Order not found!" });
            }
            if (order.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ status: "failed", message: "You are not authorized to cancel this order!" });
            }
            if (order.status === "Delivered" || order.status === "Cancelled") {
                return res.status(400).json({ status: "failed", message: "Order can't be cancelled." });
            }
            order.status = "Cancelled";
            await order.save();

            return res.status(200).json({ status: "success", message: "Your order has been cancelled." });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };


    //admin

    static getUsers = async (req, res) => {
        try {
            let { page = 1, size = 10, search = "", role = "", sortBy = "firstName", order = "asc" } = req.query;
            page = Math.max(1, parseInt(page));
            size = Math.max(1, parseInt(size));

            const filter = { role };
            if (search) {
                filter.$or = [
                    { firstName: { $regex: search, $options: "i" } },
                    { lastName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } }
                ];
            }

            const sortOptions = {
                firstName: { firstName: order === "asc" ? 1 : -1 },
                email: { email: order === "asc" ? 1 : -1 }
            };
            const sortCriteria = sortOptions[sortBy] || { firstName: 1 };

            const totalUsers = await User.countDocuments(filter);
            const users = await User.find(filter).select('-password -isVerified -addresses -cart -role')
                .skip((page - 1) * size).limit(size).sort(sortCriteria).lean().exec();

            const totalPages = Math.ceil(totalUsers / size);
            const pageUsers = users.length;
            const isFirst = page === 1;
            const isLast = page === totalPages || totalPages === 0;
            const hasNext = page < totalPages;
            const hasPrevious = page > 1;

            return res.status(200).json({ status: "success", users, totalUsers, totalPages, pageUsers, isFirst, isLast, hasNext, hasPrevious });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    }

    static getOrders = async (req, res) => {
        try {
            let { page = 1, size = 10, status, sortBy = "orderDate", order = "desc" } = req.query;
            page = Math.max(1, parseInt(page));
            size = Math.max(1, parseInt(size));

            const filter = status ? { status } : { status: { $ne: "Created" } };
            const sortOptions = {
                totalAmount: { totalAmount: order === "asc" ? 1 : -1 },
                orderDate: { orderDate: order === "asc" ? 1 : -1 }
            };
            const sortCriteria = sortOptions[sortBy] || { orderDate: -1 };

            const totalOrders = await Order.countDocuments(filter);
            const ordersRaw = await Order.find(filter).select('-userId -address -orderDate -__v')
                .skip((page - 1) * size).limit(size).sort(sortCriteria).lean().exec();
            const orders = ordersRaw.map(order => {
                const { items, ...rest } = order;
                const itemsCount = items.reduce((total, item) => total + item.quantity, 0);
                return { ...rest, itemsCount };
            });

            const totalPages = Math.ceil(totalOrders / size);
            const pageOrders = orders.length;
            const isFirst = page === 1;
            const isLast = page === totalPages || totalPages === 0;
            const hasNext = page < totalPages;
            const hasPrevious = page > 1;

            return res.status(200).json({ status: "success", orders, totalOrders, totalPages, pageOrders, isFirst, isLast, hasNext, hasPrevious });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    }

    static getOrderDetails = async (req, res) => {
        try {
            const { orderId } = req.params;
            const orderDetails = await Order.findById(orderId);
            if (!orderDetails) {
                return res.status(404).json({ status: "failed", message: "Order not found!" });
            }

            return res.status(200).json({ status: "success", orderDetails });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static updateOrderStatus = async (req, res) => {
        try {
            const { orderId } = req.params;
            const { status } = req.body;

            if (!status || !orderId) {
                return res.status(400).json({ status: "failed", message: "Status and order id are required!" });
            }
            const allowedStatuses = ["Placed", "Shipped", "Delivered", "Cancelled"];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ status: "failed", message: "Invalid status value provided!" });
            }
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ status: "failed", message: "Order not found!" });
            }
            order.status = status;
            await order.save();

            return res.status(200).json({ status: "success", message: "Order status updated successfully." });

        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, Please try again later!" });
        }
    };

    static makeManager = async (req, res) => {
        try {
            const { userId } = req.params;
            if (!userId) {
                return res.status(400).json({ status: "failed", message: "User ID is required!" });
            }
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "User not found!" });
            }
            if (user.role !== "User") {
                return res.status(400).json({ status: "failed", message: "User is already a manager!" });
            }
            user.role = "Manager";
            await user.save();

            return res.status(200).json({ status: "success", message: "User has been promoted to Manager." });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };

    static makeUser = async (req, res) => {
        try {
            const { userId } = req.params;
            if (!userId) {
                return res.status(400).json({ status: "failed", message: "Manager ID is required!" });
            }
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "failed", message: "Manager not found!" });
            }
            if (user.role !== "Manager") {
                return res.status(400).json({ status: "failed", message: "User is not a Manager. Only managers can be demoted!" });
            }
            user.role = "User";
            await user.save();

            return res.status(200).json({ status: "success", message: "Manager has been demoted to User." });
        } catch (error) {
            return res.status(500).json({ status: "failed", message: "Server error, please try again later!" });
        }
    };
}

export default userCont;