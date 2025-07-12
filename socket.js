const { Server } = require("socket.io");
const httpStatus = require("http-status");
// import AppError from "./app/error/AppError";
const getUserDetailsFromToken = require("./middleware/getUserDetailsFromToken");

const initializeSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  const onlineUser = new Set();

  io.on("connection", async (socket) => {
    console.log("connected", socket?.id);

    try {
      //----------------------user token get from front end-------------------------//
      const token =
        socket.handshake.auth?.token || socket.handshake.headers?.token;

      //----------------------check Token and return user details-------------------------//
      const user = await getUserDetailsFromToken(token);

      if (!user) {
        io.emit("io-error", { success: false, message: "invalid Token" });
        throw new Error("Invalid token");
      }

      socket.join(user?._id?.toString()); 

      //----------------------user id set in online array-------------------------//
      onlineUser.add(user?._id?.toString());

      socket.on("check", (data, callback) => {
        console.log(data);
        callback({ success: true });
      });

      //-----------------------Disconnect------------------------//
      socket.on("disconnect", () => {
        onlineUser.delete(user?._id?.toString());
        io.emit("onlineUser", Array.from(onlineUser));
        console.log("disconnect user ", socket.id);
      });
    } catch (error) {
      console.error("-- socket.io connection error --", error);
    }
  });

  return io;
};

module.exports = initializeSocketIO;
