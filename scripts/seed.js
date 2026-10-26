require("dotenv/config");
const bcrypt = require("bcrypt");
const pool = require("../db.js");
const crypto = require("node:crypto");

const seed = async () => {
  if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env");
  }
  const hashAdminPassword = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD,
    10,
  );
  const hashSystemPassword = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    10,
  );

  await pool.query(
    `
    INSERT INTO app_user (name, email, password, role, "isActive") VALUES ('System', 'system@demo.com', $1, 'REQUESTER', false) ON CONFLICT (email) DO NOTHING
    `,
    [hashSystemPassword],
  );

  await pool.query(
    `
    INSERT INTO app_user (name, email, password, role) VALUES ('Admin', $1, $2, 'ADMIN') ON CONFLICT (email) DO NOTHING
    `,
    [process.env.SEED_ADMIN_EMAIL.trim().toLowerCase(), hashAdminPassword],
  );

  await pool.query(`
    INSERT INTO location (name) VALUES ('Berlin') ON CONFLICT (name) DO NOTHING
    `);

  await pool.query(`
    INSERT INTO call_type (name) VALUES ('Incident') ON CONFLICT (name) DO NOTHING
    `);

  await pool.query(`
    INSERT INTO category (name) VALUES ('MS365') ON CONFLICT (name) DO NOTHING
    `);
};

seed()
  .then(() => console.log("Seed complete"))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
