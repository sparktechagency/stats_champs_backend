const express = require("express");
const router = express.Router();
const Club = require("../../models/Club.js");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

// @route    POST api/clubs/
// @desc     Create a new clubs
// @access   Public
router.post(
  "/",
  check("name", "Owner Name is required").notEmpty(),
  check("contact", "Contact is required").notEmpty(),
  check("email", "Email is required").isEmail(),
  check("skill", "Skill is required").notEmpty(),
  check("location", "Location  is required").notEmpty(),
  check("headline", "Headline is required").notEmpty(),
  check("shortDescription", "Short Description is required").notEmpty(),
  auth,
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const club = new Club({
        name: req.body.name,
        photo: req.body.photo,
        contact: req.body.contact,
        email: req.body.email,
        skill: req.body.skill,
        videoUrl: req.body.videoUrl,
        practicesImages: req.body.practicesImages,
        location: req.body.location,
        headline: req.body.headline,
        shortDescription: req.body.shortDescription,
        fullDescription: req.body.fullDescription,
      });
      await club.save();
      res.status(201).send(club);
    } catch (error) {
      res.status(400).send(error);
    }
  }
);

// @route    GET api/clubs/
// @desc     Get all activated clubs
// @access   Public
router.get("/", auth, async (req, res) => {
  try {
    const pageSize = parseInt(req.query.size) || 20; // Number of clubs per page
    const page = parseInt(req.query.page) || 1; // Current page
    const search = req.query.search || ""; // Search query

    const query = {
      activated: true,
      name: { $regex: search, $options: "i" }, // Search by name
    };

    const count = await Club.countDocuments(query);
    const clubs = await Club.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ _id: -1 });

    res.send({
      clubs,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    GET api/clubs/:id
// @desc     Get a clubs by ID
// @access   Public
router.get("/:id", auth, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).send();
    res.send(club);
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    PATCH api/clubs/:id
// @desc     Update a club by ID
// @access   Public
router.patch("/:id", auth, async (req, res) => {
  try {
    const club = await Club.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!club) return res.status(404).send();
    res.send(club);
  } catch (error) {
    res.status(400).send(error);
  }
});

// @route    DELETE(INACTIVE) api/clubs/:id
// @desc     Delete(Inactive) a club by ID
// @access   Public
router.delete("/:id", auth, async (req, res) => {
  try {
    const club = await Club.findByIdAndUpdate(
      req.params.id,
      { activated: false },
      { new: true }
    );
    if (!club) return res.status(404).send();
    res.send(club);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
