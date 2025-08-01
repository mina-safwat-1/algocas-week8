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
  host: "postgres",       // This matches the service name in docker-compose
  database: "myapp",
  password: "postgres",
  port: 5432,
});

// Ensure messages table exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL
);
`;

pool.query(createTableQuery)
  .then(() => console.log("✅ Messages table ready"))
  .catch(err => console.error("❌ Error creating table:", err));

// Routes

// Get all messages
app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM messages ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add a new message
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
    console.error("❌ Error saving message:", err);
    res.status(500).json({ error: "Server error" });
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
