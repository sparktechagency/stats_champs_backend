const express = require("express");
const router = express.Router();
const Clinic = require("../../models/Clinic.js");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

// @route    POST api/clinics/
// @desc     Create a new clinic
// @access   Public
router.post(
  "/",
  check("clinicName", "Clinic Name is required").notEmpty(),
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

      const clinic = new Clinic({
        clinicName: req.body.clinicName,
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
      await clinic.save();
      res.status(201).send(clinic);
    } catch (error) {
      res.status(400).send(error);
    }
  }
);

// @route    GET api/clinics/
// @desc     Get all activated clinics
// @access   Public
router.get("/", auth, async (req, res) => {
  try {
    const pageSize = parseInt(req.query.size) || 20; // Number of clinics per page
    const page = parseInt(req.query.page) || 1; // Current page
    const search = req.query.search || ""; // Search query

    const query = {
      activated: true,
      clinicName: { $regex: search, $options: "i" }, // Search by name
    };

    const count = await Clinic.countDocuments(query);
    const clinics = await Clinic.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ _id: -1 });
    res.send({
      clinics,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    GET api/clinics/:id
// @desc     Get a clinic by ID
// @access   Public
router.get("/:id", auth, async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).send();
    res.send(clinic);
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    PATCH api/clinics/:id
// @desc     Update a clinic by ID
// @access   Public
router.patch("/:id", auth, async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!clinic) return res.status(404).send();
    res.send(clinic);
  } catch (error) {
    res.status(400).send(error);
  }
});

// @route    DELETE(INACTIVE) api/clinics/:id
// @desc     Delete(Inactive) a clinic by ID
// @access   Public
router.delete("/:id", auth, async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      { activated: false },
      { new: true }
    );
    if (!clinic) return res.status(404).send();
    res.send(clinic);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
