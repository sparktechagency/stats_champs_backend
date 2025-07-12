const moment = require("moment");
const Notification = require("../models/Notification");

const createNotification = async (payload) => {
  try {
    const result = await Notification.create(payload);

    const unreadNotifications = await Notification.countDocuments({
      receiver: payload?.receiver,
      read: false,
    });
    //@ts-ignore
    const io = global.socketio;
    if (io) {
      const ver = "notification::" + payload?.receiver;
      io.emit(ver, {
        ...payload,
        unreadNotifications,
        createdAt: moment().format("YYYY-MM-DD"),
      });
    }

    return result;
  } catch (error) {
    console.log(error);
    return error.message;
  }
};

module.exports = { createNotification };
