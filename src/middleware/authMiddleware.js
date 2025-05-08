const User = require("../model/User");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

exports.authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Not authorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add fresh user check
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // Add token blacklist check (if implemented)
        if (user.tokenVersion !== decoded.tokenVersion) {
            return res.status(401).json({ message: "Token revoked" });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error(`JWT Error: ${err.message}`);
        res.status(401).json({
            message: "Not authorized",
            error: err.message, // Only send in development
        });
    }
};
exports.adminOnly = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admins only" });
    }
    next();
};
