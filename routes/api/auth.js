const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { check, body, validationResult } = require("express-validator");
const User = require("../../models/User");
const keys = require("../../config/keys");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const auth = require("../../middleware/auth");
const fs = require("fs");
const path = require("path");

const { env } = require("process");
const { sendEmail } = require("../../utils/mailsender");

// @route    POST api/auth/signup (name, email, password, confirmPassword, accountType)
// @desc     Register user for mobile app
// @access   Private

router.post(
  "/signup",
  [
    body("name").notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Invalid email"),
    body("country").notEmpty().withMessage("country is required"),
    body("address").notEmpty().withMessage("address is required"),
    body("dateOfBirth").notEmpty().withMessage("date of birth is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Passwords do not match"),
    check("contactNumber", "ContactNumber is required").exists(),
    // Add this custom validation
    body("email")
      .custom(async (value) => {
        const user = await User.findOne({ email: value });
        if (user) {
          return res.json({ message: "Email already in use" });
        }
      })
      .withMessage("Email already in use"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = new User({
        name: req.body.name,
        email: req.body.email,
        address: req.body.address,
        country: req.body.country,
        dateOfBirth: req.body.dateOfBirth,
        password: req.body.password,
        contactNumber: req.body.contactNumber,
        accountType: req.body.accountType,
      });

      // Generate a random 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000);

      // const mailTemplate = path.join(process.cwd() + "/template/otp_mail.html");
      // const html = fs
      //   .readFileSync(mailTemplate, "utf8")
      //   .replaceAll("{{otp}}", otp)
      //   .replaceAll("{{email}}", process.env.EMAIL_USER);

      // // Send OTP via email
      // const transporter = nodemailer.createTransport({
      //   service: "gmail",
      //   auth: {
      //     user: process.env.EMAIL_USER,
      //     pass: process.env.EMAIL_PASS,
      //   },
      // });

      // const mailOptions = {
      //   from: process.env.EMAIL_USER,
      //   to: user.email,
      //   subject: "Verify your email address",
      //   html,
      // };
      // console.log({ mailOptions });
      // const emailResponse = await transporter.sendMail(mailOptions);
      // console.log({ emailResponse });

      // Save the OTP to the user's profile
      user.otpCode = otp;
      user.otpCodeExpiration = Date.now() + 300000; // 5 minutes
      user.verified = false;

      // Send the OTP to the FCM token
      await user.save();

      await sendEmail(
        user.email,
        "OTP Verification ",
        `
        <div><h5>Your OTP is: ${otp}</h5>
      <p>Valid until: ${user.otpCodeExpiration.toLocaleString()}</p>
      </div>
        
        `
      );

      res
        .status(201)
        .json({ success: true, message: "User created successfully" });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        success: false,
        message: err?.message || "Error creating user",
      });
    }
  }
);

// @route    POST api/auth/signin (email, password)
// @desc     Login user for mobile app
// @access   Public

router.post(
  "/signin",
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password is required").exists(),
  async (req, res) => {
    const errors = validationResult(req);
    const search = req.query.role || "User"; // Search query
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    console.log(search);
    const { email, password, fcmToken } = req.body;

    // Build the query
    const query = {
      email: email,
      role: { $regex: search, $options: "i" }, // Search by name
    };
    try {
      let user = await User.findOne(query);
      console.log("🚀 ~ user:", user);

      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid Credentials" }] });
      }
      if (user.blocked) {
        console.log("🚀 ~ isMatch:", isMatch);
        return res.status(400).json({ errors: [{ msg: "User was blocked!" }] });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid Credentials" }] });
      }
      if (fcmToken) {
        await User.findByIdAndUpdate(user._id, { fcmToken });
      }

      const payload = {
        user: {
          id: user.id,
          name: user.name,
          fcmToken: user.fcmToken,
        },
      };

      jwt.sign(
        payload,
        keys.secretOrKey,
        { expiresIn: "30d" },
        (err, token) => {
          if (err) return err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route    POST api/auth/forgot-password
// @desc     Send password reset email
// @access   Public
// router.post("/forgot-password", async (req, res) => {
//   try {
//     const user = await User.findOne({ email: req.body.email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     // Configure email transporter
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });
//     // Generate a reset token
//     const resetToken = crypto.randomBytes(20).toString("hex");
//     // Save the reset token in the database
//     user.resetToken = resetToken;
//     user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
//     await user.save();
//     console.log("saved");
//     // Send the reset token to the user's email address
//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: user.email,
//       subject: "Password Reset",
//       text: `You requested a password reset. Click on the following link to reset your password: http://localhost:5000/reset-password/${resetToken}`,
//     };
//     console.log(process.env.EMAIL_USER);
//     console.log(process.env.EMAIL_PASS);
//     await transporter.sendMail(mailOptions);
//     console.log("sending");
//     res.status(200).json({ message: "Password reset email sent" });
//   } catch (err) {
//     console.log(err);
//     console.error(err.message);
//     res.status(500).json({ message: "Error sending password reset email" });
//   }
// });

// // @route    POST api/auth/reset-password/:token
// // @desc     Confirm password reset and update password
// // @access   Public
// router.post("/reset-password/:token", async (req, res) => {
//   try {
//     const user = await User.findOne({
//       resetToken: req.params.token,
//       resetTokenExpiration: { $gt: Date.now() },
//     });
//     if (!user) {
//       return res
//         .status(404)
//         .json({ message: "Invalid or expired reset token" });
//     }

//     // Update the user's password
//     const hashedPassword = await bcrypt.hash(req.body.password, 8);
//     user.password = hashedPassword;
//     user.resetToken = undefined;
//     user.resetTokenExpiration = undefined;
//     await user.save();

//     res.status(200).json({ message: "Password reset successful" });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ message: "Error resetting password" });
//   }
// });

// @route    PATCH api/auth/profile
// @desc     Edit user profile
// @access   Private
router.patch(
  "/profile",
  auth,
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("contactNumber")
      .optional()
      .notEmpty()
      .withMessage("Contact number cannot be empty"),
    body("password")
      .optional()
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("newPassword")
      .optional()
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters long"),
    body("confirmNewPassword")
      .optional()
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          return new Error("Passwords do not match");
        }
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update fields if they are provided
      if (req.body.name) user.name = req.body.name;
      if (req.body.contactNumber) user.contactNumber = req.body.contactNumber;

      // If changing password, verify the current password first
      if (req.body.password && req.body.newPassword) {
        const isMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isMatch) {
          return res
            .status(400)
            .json({ message: "Current password is incorrect" });
        }
        user.password = req.body.newPassword;
      }

      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: {
          name: user.name,
          contactNumber: user.contactNumber,
        },
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route    POST api/auth/forgot-password
// @desc     Send OTP for password reset
// @access   Public
router.post("/forgot-otp/verify", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!req.body.otp) {
      return res.status(500).json({ message: "otp is required" });
    }

    if (user?.otpCode !== req.body.otp) {
      return res.status(500).json({ message: "invalid otp code" });
    }
    if (user.otpCodeExpiration < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    await User.findByIdAndUpdate(user?._id, {
      otpCode: null,
      otpCodeExpiration: null,
    });
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        fcmToken: user.fcmToken,
      },
    };

    jwt.sign(payload, keys.secretOrKey, { expiresIn: "30d" }, (err, token) => {
      if (err) return err;
      res.json({ token });
    });
  } catch (err) {
    console.log("================");
    res.status(500).json({ message: err?.message });
  }
});

router.post("/reset-password", auth, async (req, res) => {
  if (!req.body.newPassword && !req.body.confirmPassword) {
    return res
      .status(500)
      .json({ message: "newPassword and confirmPassword is required" });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = await bcrypt.hash(req.body.newPassword, 8);
    const result = await User.findByIdAndUpdate(user?._id, {
      password: hashedPassword,
    });
    if (result) {
      res.json({ message: "Password reset successfully" });
    } else {
      return new res.status(500).json({ message: "Error resetting password" });
    }
  } catch (error) {
    return new res.status(500).json({ message: error.message });
  }
});
router.post("/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a random OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000);
    console.log("Generated OTP:", otpCode);

    // Save the OTP code and expiry time in the database
    user.otpCode = otpCode;
    user.otpCodeExpiration = Date.now() + 300000; // 5 minutes
    await user.save();
    console.log("saved");

    // Send the OTP code to the user's email address
    // const mailOptions = {
    //   from: process.env.EMAIL_USER,
    //   to: user.email,
    //   subject: "OTP for Password Reset",
    //   text: `Your OTP for password reset is: ${otpCode}`,
    // };

    await sendEmail(
      user.email,
      "reset password otp",
      `
      <div><h5>Your OTP is: ${otpCode}</h5>
    <p>Valid until: ${user.otpCodeExpiration.toLocaleString()}</p>
    </div>
      
      `
    );

    const payload = {
      user: {
        id: user?._id,
        name: user?.name,
        fcmToken: user?.fcmToken,
      },
    };

    jwt.sign(payload, keys.secretOrKey, { expiresIn: "5m" }, (err, token) => {
      if (err) return err;
      res.json({ token, message: "OTP code sent to your email" });
    });
  } catch (err) {
    console.log(err);
    console.error(err.message);
    res.status(500).json({ message: "Error sending OTP code" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(req.body);

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otpCode || user.otpCode !== parseInt(otp)) {
      // Important: Parse OTP to integer
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpCodeExpiration < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Clear the OTP after successful verification (important for security)
    user.otpCode = null;
    user.otpCodeExpiration = null;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
});

router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000);

    user.otpCode = otpCode;
    user.otpCodeExpiration = Date.now() + 300000; // 5 minutes
    await user.save();

    await sendEmail(
      user.email,
      "Resent OTP for Password Reset",
      `
      <div><h5>Your OTP is: ${otpCode}</h5>
    <p>Valid until: ${user.otpCodeExpiration.toLocaleString()}</p>
    </div>
      
      `
    );
    const payload = {
      user: {
        id: user?._id,
        name: user?.name,
        fcmToken: user?.fcmToken,
      },
    };

    jwt.sign(payload, keys.secretOrKey, { expiresIn: "5m" }, (err, token) => {
      if (err) return err;
      res
        .status(200)
        .json({ success: true, token, message: "New OTP sent to your email" });
    });
  } catch (err) {
    console.error("Error resending OTP:", err);
    res.status(500).json({ message: "Error resending OTP" });
  }
});

module.exports = router;
