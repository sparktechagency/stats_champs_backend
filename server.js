const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const initializeSocketIO = require("./socket");
const envFilePath = path.resolve(__dirname, "./.env");
const colors = require("colors");
const DefaultTask = require("./utils/defaultTask");
const env = require("dotenv").config({ path: envFilePath });
if (env.error) {
  throw new Error(
    `Unable to load the .env file from ${envFilePath}. Please copy .env.example to ${envFilePath}`
  );
}

const app = require("./app");

const PORT = process.env.PORT || 8000;
const IP = process.env.IP;
const SOCKET_PORT = process.env.SOCKET_PORT || 8005;
const io = initializeSocketIO(http.createServer(app));
let server;

app.set("io", io);

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    app.listen(PORT, IP, () => {
      console.log(`STATS CHAMPS SERVER RUNNING ON: ${IP}:${PORT}`.green.bold);
    });
    await DefaultTask();
    io.listen(Number(SOCKET_PORT));
    console.log(`Socket is listening on port ${IP}:${SOCKET_PORT}`.yellow.bold);

    global.socketio = io;
  } catch (err) {
    console.error(err);
  }
}
main();
process.on("unhandledRejection", (err) => {
  console.log(`😈 unahandledRejection is detected , shutting down ...`, err);
  if (server) {
    server.close(() => {
      process.exit(1);
    }); 
  }
  process.exit(1);
});

process.on("uncaughtException", () => {
  console.log(`😈 uncaughtException is detected , shutting down ...`);
  process.exit(1);
});

module.exports = io;
