const express = require("express");
const router = express.Router();
const Court = require("../../models/Court.js");
const SportType = require("../../models/SportType");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

// @route    POST api/courts/
// @desc     Create a new court
// @access   Public
router.post(
  "/",
  check("sportsType", "Sports Type is required").notEmpty(),
  check("name", "Court Name is required").notEmpty(),
  check("location", "Location  is required").notEmpty(),
  auth,
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Fetch the sportType by name
      const sportType = await SportType.findOne({ name: req.body.sportsType });
      if (!sportType)
        return res.status(404).send({ message: "Sports Type not found" });

      const court = new Court({
        photo: req.body.photo,
        sportsType: sportType._id,
        name: req.body.name,
        location: req.body.location,
        about: req.body.about,
      });
      console.log("------------------>>", court);

      await court.save();
      res.status(201).send(court);
    } catch (error) {
      res.status(400).send(error);
    }
  }
);

// @route    GET api/courts/
// @desc     Get all activated courts
// @access   Public
router.get("/", auth, async (req, res) => {
  try {
    const pageSize = parseInt(req.query.size) || 20; // Number of courts per page
    const page = parseInt(req.query.page) || 1; // Current page
    const search = req.query.search || ""; // Search query

    let sportTypeQuery = {};

    // Fetch the sportType by name if provided
    if (req.query.sportsType) {
      const sportType = await SportType.findOne({ name: req.query.sportsType });
      if (sportType) {
        sportTypeQuery = { sportsType: sportType._id };
      }
    }

    // Build the query
    const query = {
      ...sportTypeQuery,
      activated: true,
      name: { $regex: search, $options: "i" }, // Search by name
    };
    const count = await Court.countDocuments(query);

    const courts = await Court.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ _id: -1 });

    res.send({
      courts: courts.map((court) => ({
        ...court._doc,
        sportsType: court.sportsType ? court.sportsType.name : null,
      })),
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    GET api/courts/:id
// @desc     Get a court by ID
// @access   Public
router.get("/:id", auth, async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).send();
    res.send(court);
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    PATCH api/courts/:id
// @desc     Update a court by ID
// @access   Public
router.patch("/:id", auth, async (req, res) => {
  try {
    if (req.body.sportsType) {
      const sportType = await SportType.findOne({ name: req.body.sportsType });
      if (!sportType)
        return res.status(404).send({ message: "Sports Type not found" });
      req.body.sportsType = sportType._id;
    }
    const court = await Court.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!court) return res.status(404).send();
    res.send(court);
  } catch (error) {
    res.status(400).send(error);
  }
});

// @route    DELETE(INACTIVE) api/courts/:id
// @desc     Delete(Inactive) a court by ID
// @access   Public
router.delete("/:id", auth, async (req, res) => {
  try {
    const court = await Court.findByIdAndUpdate(
      req.params.id,
      { activated: false },
      { new: true }
    );
    if (!court) return res.status(404).send();
    res.send(court);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
