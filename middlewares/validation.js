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
        .withMessage("Last name must not exceed 20 characters!"),
];

export { signupValidator, loginValidator, forgotPasswordValidator, verifyPasswordOtpValidator };