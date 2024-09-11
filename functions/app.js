const express = require("express");
const serverless = require("serverless-http");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const createEmailMessage = (user, attending, notes) => {
  const attendingMessage = attending === 'yes'
    ? `${user} potwierdza przybycie`
    : `${user} nie potwierdza przybycia`;

  return `
    ${attendingMessage}

    Dotatkowe info:
    ${notes ? notes : ""}
  `;
};

const app = express();
const router = express.Router();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

router.get("/", (req, res) => {
  res.send("App is running..");
});

router.post("/send-email", async (req, res) => {
  const { name, notes, attending } = req.body;

  if (!name || !notes || !attending) {
    return res.status(400).send("Please provide 'name', 'notes', and 'attending' fields.");
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.mailgun.org",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true
    });

    transporter.verify((error, success) => {
      if (error) {
        console.log("Error verifying transporter:", error);
      } else {
        console.log("Server is ready to take our messages");
      }
    });

    const message = createEmailMessage(name, attending, notes);

    const mailOptions = {
      from: process.env.EMAIL,
      to: process.env.TO,
      subject: 'Wesele',
      text: message,
    };

    const info = await transporter.sendMail(mailOptions);
    res.status(200).send(`Email sent: ${info.response}`);
  } catch (error) {
    res.status(500).send(`Error sending email: ${error}`);
  }
});

app.use("/.netlify/functions/app", router);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports.handler = serverless(app);
