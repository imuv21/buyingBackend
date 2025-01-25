import { check, body } from "express-validator";


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
        }).withMessage("Password must contain at least 8 characters, one uppercase, one lowercase letter, one number, and one special character!"),
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
];

const forgotPasswordValidator = [
    check("email")
        .notEmpty().withMessage("Email is required!")
        .isEmail().withMessage("Invalid email address!")
        .normalizeEmail({ gmail_remove_dots: true }),
    check("role")
        .notEmpty().withMessage("Role is required!")
        .isIn(["User", "Admin"]).withMessage("Role must be either 'User' or 'Admin'!")
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
        }).withMessage("Password must contain at least 8 characters, one uppercase, one lowercase letter, one number, and one special character!"),
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
    check("firstName").not().isEmpty()
        .withMessage("First name is required!").isLength({ max: 20 })
        .withMessage("First name must not exceed 20 characters!"),
    check("lastName").not().isEmpty()
        .withMessage("Last name is required!").isLength({ max: 20 })
        .withMessage("Last name must not exceed 20 characters!")
];

const addressValidator = [
    check("address")
        .notEmpty().withMessage("Address is required!")
        .isLength({ max: 80 }).withMessage("Address must not exceed 80 characters!"),
    check("city")
        .notEmpty().withMessage("City is required!")
        .isLength({ max: 40 }).withMessage("City must not exceed 40 characters!"),
    check("landmark")
        .isLength({ max: 80 }).withMessage("Landmark must not exceed 80 characters!"),
    check("pincode")
        .isLength({ max: 20 }).withMessage("Pincode must not exceed 20 characters!"),
    check("number")
        .notEmpty().withMessage("Phone number is required!")
        .isMobilePhone("any").withMessage("Phone number must be a valid mobile number!")
];

export { signupValidator, loginValidator, forgotPasswordValidator, verifyPasswordOtpValidator, updateProfileValidator, addressValidator };