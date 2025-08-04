const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL pool setup
const pool = new Pool({
  user: "postgres",
  host: "db-endpoint.mina", // Use your actual hostname or service name in Docker
  database: "myapp",
  password: "postgres",
  port: 5432,
});

// Retry DB connection every 5 seconds if it fails
async function connectWithRetry() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log("✅ Messages table ready");
  } catch (err) {
    console.error("❌ DB connection failed, retrying in 5 seconds...", err.message);
    setTimeout(connectWithRetry, 5000); // Retry after 5 seconds
  }
}

// Start the retry logic
connectWithRetry();

// Routes
app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM messages ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching messages:", err.message);
    res.status(500).json({ error: "Server error or DB unavailable" });
  }
});

app.post("/api/messages", async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const result = await pool.query(
      "INSERT INTO messages (content) VALUES ($1) RETURNING *",
      [content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error saving message:", err.message);
    res.status(500).json({ error: "Server error or DB unavailable" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running.");
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Backend is running at http://localhost:${port}`);
});
