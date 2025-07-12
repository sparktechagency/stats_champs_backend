const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Contents = require("../../models/Contents");

router.patch("/", auth, async (req, res) => {
  if (!req?.user?.role === "admin") {
    return res.status(403).json({ message: "Access denied!" });
  }
  try {
    const result = await Contents.findOneAndUpdate({}, req.body);
    return res.status(200).json({
      success: true,
      message: "contents get successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Contents get failed!",
    });
  }
});

router.get("/:filedName", async (req, res) => {
  const query = req.params.filedName;
  try {
    const result = await Contents.findOne({});
    const data = result[`${query}`];

    return res.status(200).json({
      success: true,
      message: "contents get successfully",
      data: data || "",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Contents get failed!",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await Contents.findOne({});

    return res.status(200).json({
      success: true,
      message: "contents get successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Contents get failed!",
    });
  }
});

const contentsRouter = router;
module.exports = contentsRouter;
