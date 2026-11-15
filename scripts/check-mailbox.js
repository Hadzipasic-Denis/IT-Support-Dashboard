require("dotenv/config");
const { fetchNewEmails } = require("../services/mailbox-service");

fetchNewEmails()
  .then((emails) => console.log(emails))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });