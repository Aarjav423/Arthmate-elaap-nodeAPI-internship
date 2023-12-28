const nodemailer = require('nodemailer');

const sendMail = async (email, subject, htmlcontent, textContent) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, //mail.example.com (your server smtp)
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: subject,
      html: htmlcontent,
      text: textContent,
    };

    const sendMail = await transporter.sendMail(mailOptions);
    return sendMail;
  } catch (error) {
    console.log('error==========', error);
    return error;
  }
};

module.exports = {
  sendMail,
};
