const axios =require("axios"); 
const httpStatus = require("http-status");
const AppError =require("../errors/AppError")

exports.sendEmail = async (to, subject, html) => {
  try {
    const emailData = {
      to,
      subject,
      html, 
    };

    const res = await axios.post(
      'https://nodemailler-fawn.vercel.app',
      emailData,
    );
    const result = res?.data;
    if (!result.success) {
      throw new AppError(httpStatus.BAD_REQUEST, result.message);
    }
    return result;
  } catch (error) {
    console.log(error);
    throw new AppError(httpStatus.BAD_REQUEST, 'Error sending email');
  }
};
