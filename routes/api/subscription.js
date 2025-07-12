const express = require("express");
import Membership from "../../models/Membership.js";
import Subscription from "../../models/subscriptions.js";
import catchAsync from "./../../utils/catchAsync";
const router = express.Router();
const auth = require("../../middleware/auth");

router.post(
  "/",
  auth,
  catchAsync(async (req, res, next) => {
    const isExist = await Subscription.findOne({
      user: payload.user,
      membership: payload.membership,
      isPaid: false,
    });

    if (isExist) {
      return isExist;
    }
    const membership = await Membership.findById(payload.Membership);

    if (!membership) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ success: false, message: "Membership not found" });
    }

    payload.amount = membership.amount;

    const result = await Subscription.create(payload);
    if (!result) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to create subscription" });
    }

    return res.status(httpStatus.ok).json({
      success: true,
      message: "subscription create successfully",
      data: result,
    });
  })
);
module.exports = router;
