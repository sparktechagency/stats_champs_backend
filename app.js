const express = require("express");
const passport = require("passport");
const routes = require("./routes");
const keys = require("./config/keys");
const session = require("express-session");
const path = require("path");
const http = require("http");
const cors = require("cors");
const { memoryStorage } = require("multer");
const multer = require("multer");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const initializeSocketIO = require("./socket");
const envFilePath = path.resolve(__dirname, "./.env");
const env = require("dotenv").config({ path: envFilePath });
if (env.error) {
  throw new Error(
    `Unable to load the .env file from ${envFilePath}. Please copy .env.example to ${envFilePath}`
  );
}

const app = express();

app.use(
  session({
    secret: keys.secretOrKey,
    resave: true,
    saveUninitialized: true,
  })
);

const io = initializeSocketIO(http.createServer(app));

// Middleware to parse JSON bodies
app.use(express.json());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.set("io", io);

// Define your allowed origins
const allowedOrigins = [
  "*",
  "https://stats-champ-dashboard.vercel.app",
  "http://localhost:5004",
  "http://110.10.10.15:9005",
  "http://110.10.10.15",
  "http://localhost:8003/",
];

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Allow cookies to be sent
};

// Use CORS middleware
app.use(cors(corsOptions));

// Routes
app.use("/api", routes);

//start image upload in aws
const storage = memoryStorage();
const upload = multer({ storage });
app.post("/api/upload", upload.single("image"), async (req, res) => {
  const fileName = `images/${Math.floor(
    100000 + Math.random() * 900000
  )}_${Date.now()}`;

  const s3client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.S3_BUCKET_ACCESS_KEY,
      secretAccessKey: process.env.S3_BUCKET_SECRET_ACCESS_KEY,
    },
  });
  try {
    if (req.file) {
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      const key = await s3client.send(command);
      if (!key) {
        res.status(400).json({ message: "upload image failed" });
      }

      const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${
        process.env.AWS_REGION
      }.amazonaws.com/${fileName}?v=${Date.now()}`;

      res.status(200).json({ url: url });
    }
  } catch (error) {
    res.status(400).json({ message: error?.message });
  }
});

module.exports = app;
