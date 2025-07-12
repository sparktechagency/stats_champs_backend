const express = require("express");
const router = express.Router();
const School = require("../../models/School.js");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

// @route    POST api/schools/
// @desc     Create a new school
// @access   Public
router.post(
  "/",
  check("name", "School Name is required").notEmpty(),
  check("contact", "Contact is required").notEmpty(),
  check("location", "Location  is required").notEmpty(),
  check("about", "About is required").notEmpty(),
  auth,
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const school = new School({
        photo: req.body.photo,
        name: req.body.name,
        contact: req.body.contact,
        location: req.body.location,
        about: req.body.about,
      });
      await school.save();
      res.status(201).send(school);
    } catch (error) {
      res.status(400).send(error);
    }
  }
);

// @route    GET api/schools/
// @desc     Get all activated schools
// @access   Public
router.get("/", auth, async (req, res) => {
  try {
    const pageSize = parseInt(req.query.size) || 20; // Number of schools per page
    const page = parseInt(req.query.page) || 1; // Current page
    const search = req.query.search || ""; // Search query

    // Build the query
    const query = {
      activated: true,
      name: { $regex: search, $options: "i" }, // Search by name
    };

    const count = await School.countDocuments(query);
    const schools = await School.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ _id: -1 });

    res.send({
      schools,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    GET api/schools/:id
// @desc     Get a school by ID
// @access   Public
router.get("/:id", auth, async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).send();
    res.send(school);
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    PATCH api/schools/:id
// @desc     Update a school by ID
// @access   Public
router.patch("/:id", auth, async (req, res) => {
  try {
    const school = await School.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!school) return res.status(404).send();
    res.send(school);
  } catch (error) {
    res.status(400).send(error);
  }
});

// @route    DELETE(INACTIVE) api/schools/:id
// @desc     Delete(Inactive) a school by ID
// @access   Public
router.delete("/:id", auth, async (req, res) => {
  try {
    const school = await School.findByIdAndUpdate(
      req.params.id,
      { activated: false },
      { new: true }
    );
    if (!school) return res.status(404).send();
    res.send(school);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
