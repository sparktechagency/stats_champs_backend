const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");

// @route    Get api/users/
// @desc     Get all users for amdin
// @access   Public

// router.get('/', auth, async(req, res) => {
router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default to 10 users
  try {
    const users = await User.find()
      .limit(limit)
      .skip((page - 1) * limit);
    const totalUsers = await User.countDocuments();

    res.json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
});

// @route    PUT api/users/:id/profile
// @desc     Update user profile
// @access   Private

// @route    PUT api/users/:id/profile
// @desc     Update user profile (any field)
// @access   Private

router.put("/profile/:id", async (req, res) => {
  try {
    // Check if the user is trying to update their own profile or if the admin is updating a user
    // if (req.user.id !== req.params.id && !req.user.isAdmin) {
    //   return res
    //     .status(403)
    //     .json({ message: "Unauthorized to update this profile" });
    // }

    // Get all fields to update from the request body
    const updatedFields = req.body;

    // Check if the user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user fields
    Object.keys(updatedFields).forEach((key) => {
      if (user[key] !== undefined) {
        user[key] = updatedFields[key]; // Update all fields present in the request body
      }
    });

    // Save updated user
    await user.save();

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating profile", error });
  }
});

// @route    PUT api/users/:id/block
// @desc     Block a user for admin
// @access   Private (admin only)

router.put("/:id/block", auth, async (req, res) => {
  // Check if the user is an admin
  // if (!req.user.isAdmin) {
  //     return res.status(403).json({ message: 'Admin privileges required' });
  // }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.blocked = true;
    await user.save();
    console.log(user);
    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error blocking user", error });
  }
});

// @route    PUT api/users/:id/unblock
// @desc     Unblock a user for admin
// @access   Private (admin only)

router.put("/:id/unblock", auth, async (req, res) => {
  // Check if the user is an admin
  // if (!req.user.isAdmin) {
  //     return res.status(403).json({ message: 'Admin privileges required' });
  // }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.blocked = false;
    await user.save();

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error unblocking user", error });
  }
});

// @route    GET api/auth
// @desc     Get user by token
// @access   Private
router.patch("/update-my-profile", auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
})

router.get("/my-profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
