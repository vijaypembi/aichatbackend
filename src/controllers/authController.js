// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../model/User");
const { generateToken } = require("../config/generateToken");

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: "User already exists" });
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters" });
        }
        if (role !== "user" && role !== "admin") {
            return res.status(400).json({ message: "Invalid role" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
        });
        await newUser.save();

        const token = generateToken(newUser);

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                role: newUser.role,
                email: newUser.email,
            },
        });
    } catch (err) {
        res.status(500).json({
            message: "Registration failed",
            error: err.message,
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        // console.log("User found:", user); // Debugging line
        if (!user)
            return res.status(401).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        // console.log("Password:", password); // Debugging line
        if (!isMatch)
            return res.status(401).json({ message: "Invalid password" });

        const token = generateToken(user);

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                email: user.email,
            },
        });
    } catch (err) {
        res.status(500).json({ message: "Login failed", error: err.message });
    }
};
