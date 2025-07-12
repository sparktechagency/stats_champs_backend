const express = require("express");
const router = express.Router();
const PhysicalTherapist = require("../../models/PhysicalTherapist.js");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

// @route    POST api/physicalTherapists/
// @desc     Create a new physical therapist
// @access   Public
router.post(
  "/",
  check(
    "physicalTherapistName",
    "Physical Therapist Name is required"
  ).notEmpty(),
  check("ownerName", "Owner Name is required").notEmpty(),
  check("contact", "Contact is required").notEmpty(),
  check("email", "Email is required").isEmail(),
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

      const physicalTherapist = new PhysicalTherapist({
        physicalTherapistName: req.body.physicalTherapistName,
        ownerName: req.body.ownerName,
        photo: req.body.photo,
        contact: req.body.contact,
        email: req.body.email,
        videoUrl: req.body.videoUrl,
        practicesImages: req.body.practicesImages,
        location: req.body.location,
        headline: req.body.headline,
        shortDescription: req.body.shortDescription,
        fullDescription: req.body.fullDescription,
      });
      await physicalTherapist.save();
      res.status(201).send(physicalTherapist);
    } catch (error) {
      res.status(400).send(error);
    }
  }
);

// @route    GET api/physicalTherapists/
// @desc     Get all activated physical therapists
// @access   Public
router.get("/", auth, async (req, res) => {
  try {
    const pageSize = parseInt(req.query.size) || 20; // Number of physical therapists per page
    const page = parseInt(req.query.page) || 1; // Current page
    const search = req.query.search || ""; // Search query

    const query = {
      activated: true,
      physicalTherapistName: { $regex: search, $options: "i" }, // Search by name
    };

    const count = await PhysicalTherapist.countDocuments(query);
    console.log(count);
    const physicalTherapists = await PhysicalTherapist.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ _id: -1 });

    res.send({
      physicalTherapists,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    GET api/physicalTherapists/:id
// @desc     Get a physical therapist by ID
// @access   Public
router.get("/:id", auth, async (req, res) => {
  try {
    const physicalTherapist = await PhysicalTherapist.findById(req.params.id);
    if (!physicalTherapist) return res.status(404).send();
    res.send(physicalTherapist);
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    PATCH api/physicalTherapists/:id
// @desc     Update a physical therapist by ID
// @access   Public
router.patch("/:id", auth, async (req, res) => {
  try {
    const physicalTherapist = await PhysicalTherapist.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!physicalTherapist) return res.status(404).send();
    res.send(physicalTherapist);
  } catch (error) {
    res.status(400).send(error);
  }
});

// @route    DELETE(INACTIVE) api/physicalTherapists/:id
// @desc     Delete(Inactive) a physical therapist by ID
// @access   Public
router.delete("/:id", auth, async (req, res) => {
  try {
    const physicalTherapist = await PhysicalTherapist.findByIdAndUpdate(
      req.params.id,
      { activated: false },
      { new: true }
    );
    if (!physicalTherapist) return res.status(404).send();
    res.send(physicalTherapist);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
