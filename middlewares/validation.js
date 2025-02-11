import { check, body } from "express-validator";
import { Filter } from "bad-words";
const filter = new Filter();
const hindiBadWords = [
    "gandu", "sala", "bhenchod", "madarchod", "cunt", "londa", "babu", "tittu",
    "chutiya", "bibi", "loli", "kutta", "gand", "marr", "tad", "hindi",
    "lakkhan", "chalu", "patta", "fuck", "kaala", "gand", "marr", "behd",
    "churriya", "hawa", "titi", "nalli", "randi", "maand", "shod", "patu",
    "tatta", "kaki", "dandu", "macha", "hara", "jhangar", "lundi", "bawan",
    "chana", "far", "gaada", "pate", "baddo", "tund", "mair", "kara",
    "pidi", "rudi", "taddi", "behenchod", "madarchod", "mc", "bc"
];

filter.addWords(...hindiBadWords);



const signupValidator = [
    check("email")
        .notEmpty().withMessage("Email is required!")
        .isEmail().withMessage("Invalid email address!")
        .normalizeEmail({ gmail_remove_dots: true }),
    check("role")
        .notEmpty().withMessage("Role is required!")
        .isIn(["User", "Admin"]).withMessage("Role must be either 'User' or 'Admin'!"),
    check("password")
        .notEmpty().withMessage("Password is required!")
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage("Password must contain at least 8 characters, one uppercase, one lowercase letter, one number, and one special character!")
        .isLength({ max: 50 }).withMessage("Password must not exceed 50 characters!"),
    body("confirmPassword")
        .notEmpty().withMessage("Confirm Password is required!")
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match!");
            }
            return true;
        })
];

const loginValidator = [
    check("email")
        .notEmpty().withMessage("Email is required!")
        .isEmail().withMessage("Invalid email address!")
        .normalizeEmail({ gmail_remove_dots: true }),
    check("role")
        .notEmpty().withMessage("Role is required!")
        .isIn(["User", "Manager", "Admin"]).withMessage("Role must be either 'User' or 'Manager'!"),
    check("password")
        .notEmpty().withMessage("Password is required!")
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage("Password must contain at least 8 characters, one uppercase, one lowercase letter, one number, and one special character!")
        .isLength({ max: 50 }).withMessage("Password must not exceed 50 characters!")
];

const forgotPasswordValidator = [
    check("email")
        .notEmpty().withMessage("Email is required!")
        .isEmail().withMessage("Invalid email address!")
        .normalizeEmail({ gmail_remove_dots: true }),
    check("role")
        .notEmpty().withMessage("Role is required!")
        .isIn(["User", "Manager", "Admin"]).withMessage("Role must be either 'User' or 'Manager'!"),
];

const verifyPasswordOtpValidator = [
    check("otp")
        .notEmpty().withMessage("OTP is required!")
        .isNumeric().withMessage("OTP must be a number!")
        .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits long!"),
    check("newPassword")
        .notEmpty().withMessage("Password is required!")
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage("Password must contain at least 8 characters, one uppercase, one lowercase letter, one number, and one special character!")
        .isLength({ max: 50 }).withMessage("Password must not exceed 50 characters!"),
    body("confirmNewPassword")
        .notEmpty().withMessage("Confirm Password is required!")
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error("Passwords do not match!");
            }
            return true;
        })
];

const updateProfileValidator = [
    check("firstName")
        .not().isEmpty().withMessage("First name is required!")
        .isLength({ max: 100 }).withMessage("First name must not exceed 100 characters!"),
    check("lastName")
        .not().isEmpty().withMessage("Last name is required!")
        .isLength({ max: 100 }).withMessage("Last name must not exceed 100 characters!")
];

const addressValidator = [
    check("address")
        .notEmpty().withMessage("Address is required!")
        .isLength({ max: 400 }).withMessage("Address must not exceed 400 characters!"),
    check("city")
        .notEmpty().withMessage("City is required!")
        .isLength({ max: 86 }).withMessage("City must not exceed 86 characters!"),
    check("landmark")
        .isLength({ max: 200 }).withMessage("Landmark must not exceed 200 characters!"),
    check("pincode")
        .isLength({ max: 13 }).withMessage("Pincode must not exceed 13 characters!"),
    check("number")
        .notEmpty().withMessage("Phone number is required!")
        .isMobilePhone("any").withMessage("Phone number must be a valid mobile number!")
];

const addProductValidator = [
    body("tags")
        .isArray({ min: 1 }).withMessage("Tags must be an array with at least one tag!")
        .custom((tags) => {
            for (let tag of tags) {
                if (typeof tag !== 'string' || tag.trim() === '') {
                    throw new Error("Tags cannot be empty or whitespace!");
                }
                if (tag.length > 100) {
                    throw new Error("Tags must not exceed 100 characters!");
                }
            }
            return true;
        }),
    body("title")
        .notEmpty().withMessage("Title is required!")
        .isLength({ max: 300 }).withMessage("Title must not exceed 300 characters!"),
    body("category")
        .notEmpty().withMessage("Category is required!"),
    body("originalPrice")
        .notEmpty().withMessage("Original price is required!")
        .toFloat().isFloat({ gt: 0, lt: 100000 }).withMessage("Original price must be a number between 1 and 99999!"),
    body("salePrice")
        .notEmpty().withMessage("Sale price is required!")
        .toFloat().isFloat({ gt: 0, lt: 99999 }).withMessage("Sale price must be a number between 1 and 99998!")
        .custom((value, { req }) => {
            if (value > req.body.originalPrice) {
                throw new Error("Sale price must be less than the original price!");
            }
            return true;
        }),
    body("stocks")
        .notEmpty().withMessage("Stock is required!")
        .isInt({ min: 0, max: 10000000 }).withMessage("Stocks must be an integer between 0 and 10,000,000!"),
    body("information")
        .notEmpty().withMessage("Information is required!")
        .isLength({ max: 1000 }).withMessage("Information must not exceed 1000 characters!")
];

const addReviewValidator = [
    check("reviewText")
        .not().isEmpty().withMessage("Review is required!")
        .isLength({ max: 300 }).withMessage("Review must not exceed 300 characters!")
        .custom((value) => {
            if (filter.isProfane(value)) {
                throw new Error("Inappropriate language is not allowed!");
            }
            return true;
        }),
    body("rating")
        .notEmpty().withMessage("Rating is required!")
        .isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5!"),
];


export { signupValidator, loginValidator, forgotPasswordValidator, verifyPasswordOtpValidator, updateProfileValidator, addressValidator, addProductValidator, addReviewValidator };