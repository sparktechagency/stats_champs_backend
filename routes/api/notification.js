const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Notification = require("../../models/Notification");

router.get("/", auth, async (req, res) => {
  const userId = await req.user.id;
  try {
    const result = await Notification.find({ receiver: userId });
    return res.status(200).json({
      success: true,
      message: "notification get successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "notification get failed!",
    });
  }
});
router.patch("/", auth, async (req, res) => {
  const userId = await req.user.id;
  try {
    const result = await Notification.updateMany(
      { receiver: userId, read: false },
      { read: true },
      { new: true }
    );

    if (!result) {
      return res
        .status(500)
        .json({ success: false, message: "notification update failed!" });
    }

    return res.status(200).json({
      success: true,
      message: "notification read successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "notification update failed!",
    });
  }
});
router.delete("/", auth, async (req, res) => {
  const userId = await req.user.id;
  try {
    const result = await Notification.deleteMany({ receiver: userId });

    if (!result) {
      return res
        .status(500)
        .json({ success: false, message: "notifications delete failed!" });
    }

    return res.status(200).json({
      success: true,
      message: "notifications delete successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "notifications delete failed!",
    });
  }
});

// router.post("/", auth, async (req, res) => {
//   try {
//     const { userId, title, body, type, data } = req.body;

//     if (!userId || !title || !body) {
//       return res
//         .status(400)
//         .json({ message: "Title, body, and userId are required" });
//     }

//     const userToken = await getUserToken(userId);
//     if (!userToken) {
//       return res.status(404).json({ message: "User FCM token not found" });
//     }

//     const message = {
//       token: userToken,
//       notification: {
//         title,
//         body,
//       },
//       data: {
//         type: type || "general",
//         ...data,
//       },
//     };

//     const response = await messaging.send(message);
//     res.status(200).json({ message: "Notification sent", response });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// // @route    POST api/notifications/topic
// // @desc     Send a notification to a topic
// // @access   Private
// router.post("/topic", auth, async (req, res) => {
//   try {
//     const { topic, title, body, data } = req.body;

//     if (!topic || !title || !body) {
//       return res
//         .status(400)
//         .json({ message: "Topic, title, and body are required" });
//     }

//     const message = {
//       topic,
//       notification: {
//         title,
//         body,
//       },
//       data: data || {},
//     };

//     const response = await messaging.send(message);
//     res.status(200).json({ message: "Notification sent to topic", response });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// // @route    POST api/notifications/subscribe
// // @desc     Subscribe a user to a topic
// // @access   Private
// router.post("/subscribe", auth, async (req, res) => {
//   try {
//     const { token, topic } = req.body;

//     if (!token || !topic) {
//       return res.status(400).json({ message: "Token and topic are required" });
//     }

//     const response = await messaging.subscribeToTopic(token, topic);
//     res.status(200).json({ message: "Subscribed to topic", response });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// // @route    POST api/notifications/unsubscribe
// // @desc     Unsubscribe a user from a topic
// // @access   Private
// router.post("/unsubscribe", auth, async (req, res) => {
//   try {
//     const { token, topic } = req.body;

//     if (!token || !topic) {
//       return res.status(400).json({ message: "Token and topic are required" });
//     }

//     const response = await messaging.unsubscribeFromTopic(token, topic);
//     res.status(200).json({ message: "Unsubscribed from topic", response });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// // Utility function to get a user’s FCM token
// async function getUserToken(userId) {
//   // Replace with actual logic to retrieve the FCM token from your database
//   // Example:
//   const user = await User.findById(userId);
//   return user?.fcmToken || null;
//   //   return "sample_fcm_token"; // Placeholder for demonstration
// }

// // Cron job to clean up Firebase topics or perform scheduled notifications
// cron.schedule("0 0 * * *", async () => {
//   try {
//     console.log("Scheduled Firebase notification tasks running...");
//     // Add logic for scheduled notifications or topic cleanups
//   } catch (error) {
//     console.error("Error during scheduled Firebase tasks:", error);
//   }
// });

module.exports = router;
