const express = require("express");
const router = express.Router();
const authRoutes = require("./api/auth");
const userRoutes = require("./api/users");
const teamRoutes = require("./api/teams");
const playerRoutes = require("./api/players");
const courtRoutes = require("./api/courts");
const schoolRoutes = require("./api/schools");
const clinicRoutes = require("./api/clinics");
const clubRoutes = require("./api/clubs");
const physicalTherapistsRoutes = require("./api/physicalTherapists");
const earningsRoutes = require("./api/earnings");
const membershipRoutes = require("./api/memberships");
const blogRoutes = require("./api/blogs");
const gameRoutes = require("./api/games");
const tournamentRoutes = require("./api/tournaments");
const notificationRoutes = require("./api/notification");
const contentsRouter = require("./api/contents");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/teams", teamRoutes);
router.use("/players", playerRoutes);
router.use("/courts", courtRoutes);
router.use("/schools", schoolRoutes);
router.use("/clinics", clinicRoutes);
router.use("/clubs", clubRoutes);
router.use("/physicalTherapists", physicalTherapistsRoutes);
router.use("/earnings", earningsRoutes);
router.use("/memberships", membershipRoutes);
router.use("/blogs", blogRoutes);
router.use("/games", gameRoutes);
router.use("/tournaments", tournamentRoutes);
router.use("/notification", notificationRoutes);
router.use("/contents", contentsRouter);

// Export the router as a middleware function
module.exports = router;
