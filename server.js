const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./src/config/connectDB");
const chatRoutes = require("./src/routes/chatRoutes");
const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const {
    authMiddleware,
    adminOnly,
} = require("./src/middleware/authMiddleware");
const cookieParser = require("cookie-parser");

dotenv.config();
const PORT = process.env.PORT || 5000;
const app = express();
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);
app.use(express.json());
app.use(express.static("public"));

// api/chat/
// /api/auth/register
// /api/auth/login
app.use("/api/auth", authRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
app.use("/api/admin", authMiddleware, adminOnly, adminRoutes);
const startServer = async () => {
    try {
        await connectDB();
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect:", error);
        process.exit(1); // Exit the process if DB connection fails
    }
};

startServer();
