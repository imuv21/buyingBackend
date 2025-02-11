import mongoose from "mongoose";

// Review subdocument schema
const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: true,
        trim: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

// Product schema
const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    originalPrice: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: true
    },
    information: {
        type: String,
        required: true,
        trim: true
    },
    stocks: {
        type: Number,
        required: true,
        default: 0
    },
    inStock: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    boughtCounter: {
        type: Number,
        default: 0
    },
    oneStar: {
        type: Number,
        default: 0
    },
    twoStar: {
        type: Number,
        default: 0
    },
    threeStar: {
        type: Number,
        default: 0
    },
    fourStar: {
        type: Number,
        default: 0
    },
    fiveStar: {
        type: Number,
        default: 0
    },
    reviews: [reviewSchema],
    averageRating: {
        type: Number,
        default: 0
    },
    images: [
        {
            type: String,
            required: true
        }
    ],
    tags: {
        type: [String],
        required: true,
        default: []
    }
});

// Category schema
const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true,
        trim: true
    },
    categoryImage: {
        type: String,
        trim: true
    }
});

// Tag schema
const tagSchema = new mongoose.Schema({
    tagName: {
        type: String,
        required: true,
        trim: true
    }
});

// Address schema
const addressSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        trim: true,
    },
    city: {
        type: String,
        required: true,
        trim: true,
    },
    landmark: {
        type: String,
        trim: true,
    },
    pincode: {
        type: String,
        trim: true,
    },
    number: {
        type: String,
        required: true,
        trim: true,
    },
    isDefault: {
        type: Boolean,
        default: false
    }
});

// Cart schema
const cartSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    color: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    }
});

// Order schema
const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        title: {
            type: String,
            required: true
        },
        salePrice: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        color: {
            type: String,
            required: true
        },
        size: {
            type: String,
            required: true
        },
        image: {
            type: String,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    address: {
        type: addressSchema,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ["online", "cod"],
        required: true
    },
    status: {
        type: String,
        enum: ["Created", "Placed", "Shipped", "Delivered", "Cancelled"],
        default: "Created"
    },
    orderDate: {
        type: Date,
        default: Date.now
    }
});

// User schema
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ["User", "Admin", "Manager"],
        default: "User",
    },
    password: {
        type: String,
        required: true,
        trim: true,
    },
    isVerified: {
        type: Number,
        default: 0,
    },
    otp: {
        type: Number,
        trim: true,
    },
    otpExpiry: {
        type: Date,
    },
    addresses: [addressSchema],
    cart: [cartSchema]
});

// Models
const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);
const Category = mongoose.model("Category", categorySchema);
const Tag = mongoose.model("Tag", tagSchema);
const Order = mongoose.model("Order", orderSchema);

export { User, Product, Category, Tag, Order };
