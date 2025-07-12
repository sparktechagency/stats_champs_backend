const Contents = require("../models/Contents");
const User = require("../models/User");

async function DefaultTask() {
  // Add your default task here

  // check admin is exist
  const admin = await User.findOne({ role: "Admin" });
  if (!admin) {
    await User.create({
      name: "MD Nazmul Hasan",
      email: "admin@gmail.com",
      contactNumber: "+8801321834780",
      password: "112233",
      role: "Admin",
      verified: true,
    });
  }

  const content = await Contents.findOne({});
  if (!content) {
    await Contents.create({
      aboutUs: "",
      termsAndConditions: "",
      privacyPolicy: "",
      supports: "",
    });
  }
}

module.exports = DefaultTask;
