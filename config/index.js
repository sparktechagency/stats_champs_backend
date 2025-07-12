const path = require("path")

const envFilePath = path.resolve(__dirname, "../.env");
const env = require("dotenv").config({ path: envFilePath });
if (env.error) {
  throw new Error(
    `Unable to load the .env file from ${envFilePath}. Please copy .env.example to ${envFilePath}`
  );
}


module.exports={
    socket_port: process.env.SOCKET_PORT,
    ip:process.env.IP,
    port: process.env.PORT,
    database_url: process.env.MONGODB_URI 
}