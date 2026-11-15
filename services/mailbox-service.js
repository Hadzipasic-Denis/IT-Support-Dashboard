const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");

const fetchNewEmails = async () => {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT),
    secure: true,
    auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASSWORD },
    logger: false,
  });
  const emails = [];

  await client.connect();

  try {
    const lock = await client.getMailboxLock(process.env.IMAP_MAILBOX);
    try {
      for await (const msg of client.fetch(
        { seen: false },
        { uid: true, source: true },
      )) {
        const parsed = await simpleParser(msg.source);

        emails.push({
          uid: msg.uid,
          fromEmail: parsed.from?.value[0]?.address,
          fromName: parsed.from?.value[0]?.name,
          subject: parsed.subject,
          messageId: parsed.messageId,
          inReplyTo: parsed.inReplyTo,
          references: parsed.references,
          text: parsed.text,
          html: parsed.html,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return emails;
};

module.exports = {
  fetchNewEmails,
};
