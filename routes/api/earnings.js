const express = require("express");
const router = express.Router();
const Membership = require("../../models/Membership");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const Subscription = require("../../models/subscriptions");
const moment = require("moment");

// @route    GET api/earnings/today
// @desc     Get today's earning
// @access   Public

router.get("/today", auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Today's earnings
    const todaysEarnings = await User.aggregate([
      {
        $unwind: "$memberships",
      },
      {
        $match: {
          "memberships.purchaseDate": { $gte: startOfDay, $lte: endOfDay },
          "memberships.isActive": true,
        },
      },
      {
        $lookup: {
          from: "memberships",
          localField: "memberships.membership",
          foreignField: "_id",
          as: "membershipDetails",
        },
      },
      {
        $unwind: "$membershipDetails",
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$membershipDetails.amount" },
        },
      },
    ]);

    res.json({ todaysEarnings: todaysEarnings[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving earnings.", error });
  }
});

// @route    POST api/earnings/total
// @desc     Get total earnings
// @access   Public
router.get("/total", auth, async (req, res) => {
  try {
    const totalEarnings = await User.aggregate([
      {
        $unwind: "$memberships",
      },
      {
        $lookup: {
          from: "memberships",
          localField: "memberships.membership",
          foreignField: "_id",
          as: "membershipDetails",
        },
      },
      {
        $unwind: "$membershipDetails",
      },
      {
        $match: {
          "memberships.isActive": true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$membershipDetails.amount" },
        },
      },
    ]);

    res.json({ totalEarnings: totalEarnings[0]?.total || 0 });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving total earnings.", error });
  }
});

// @route    POST api/earnings/users
// @desc     Get user list
// @access   Public

router.get("/users", auth, async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $unwind: "$memberships",
      },
      {
        $lookup: {
          from: "memberships",
          localField: "memberships.membership",
          foreignField: "_id",
          as: "membershipDetails",
        },
      },
      {
        $unwind: "$membershipDetails",
      },
      {
        $match: {
          "memberships.isActive": true,
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          membershipPurchaseDate: "$memberships.purchaseDate",
          membershipAmount: "$membershipDetails.amount",
        },
      },
    ]);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving user list.", error });
  }
});

router.get("/dashboard-data", async (req, res) => {
  try {
    const query = req.query;
    const year = query.incomeYear ? query.incomeYear : moment().year();
    const startOfYear = moment().year(year).startOf("year").toDate();
    const endOfYear = moment().year(year).endOf("year").toDate();

    const incomeData = await Subscription.aggregate([
      {
        $facet: {
          totalIncome: [
            { $match: { isPaid: true } },
            { $group: { _id: null, totalEarnings: { $sum: "$amount" } } },
            { $project: { totalEarnings: 1, _id: 0 } },
          ],
          monthlyIncome: [
            {
              $match: {
                isPaid: true,
                createdAt: {
                  $gte: startOfYear,
                  $lte: endOfYear,
                },
              },
            },
            {
              $group: {
                _id: { month: { $month: "$createdAt" } },
                income: { $sum: "$amount" },
              },
            },
            {
              $sort: { "_id.month": 1 },
            },
          ],
        },
      },
    ]);
    const totalIncome =
      incomeData[0].totalIncome.length > 0
        ? incomeData[0].totalIncome[0].totalEarnings
        : 0;

    const monthlyIncome = incomeData[0].monthlyIncome;
    const formattedMonthlyIncome = Array.from({ length: 12 }, (_, index) => ({
      month: moment().month(index).format("MMM"),
      income: 0,
    }));

    const userYear = query?.joinYear ? query?.joinYear : moment().year();
    const startOfUserYear = moment().year(userYear).startOf("year");
    const endOfUserYear = moment().year(userYear).endOf("year");

    monthlyIncome.forEach((entry) => {
      formattedMonthlyIncome[entry._id.month - 1].income = entry.income;
    });

    const userAggregation = [
      {
        $facet: {
          totalUsers: [
            {
              $match: {
                blocked: false,
                //   verified: true,
              },
            },
            { $count: "count" },
          ],
          userDetails: [
            {
              $match: {
                blocked: false,
                //   verified: true,
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $limit: 15,
            },
          ],
          monthlyUser: [
            {
              $match: {
                blocked: false,
                createdAt: {
                  $gte: startOfUserYear.toDate(),
                  $lte: endOfUserYear.toDate(),
                },
              },
            },
            {
              $group: {
                _id: { month: { $month: "$createdAt" } },
                total: { $sum: 1 }, // Corrected to count the documents
              },
            },
            {
              $sort: { "_id.month": 1 },
            },
          ],
        },
      },
    ];

    const userData = await User.aggregate(userAggregation);
    // console.log(userData);

    const monthlyUser = userData[0]?.monthlyUser;

    const formattedMonthlyUsers = Array.from({ length: 12 }, (_, index) => ({
      month: moment().month(index).format("MMM"),
      total: 0,
    }));

    monthlyUser.forEach((entry) => {
      formattedMonthlyUsers[entry._id.month - 1].total = Math.round(
        entry.total
      );
    });

    const totalUsers = userData[0]?.totalUsers[0]?.count || 0;
    const userList = userData[0]?.userDetails || [];

    return res.status(200).json({
      success: true,
      message: "Dashboard data get success",
      data: {
        totalIncome,
        totalUsers,
        monthlyIncome: formattedMonthlyIncome,
        monthlyUser: formattedMonthlyUsers,
        userList,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Dashboard data fetch failed!",
    });
  }
});
module.exports = router;
