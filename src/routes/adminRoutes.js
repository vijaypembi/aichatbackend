const express = require("express");
const { postChat, getChats } = require("../controllers/chatController");

const multer = require("multer");
const storage = multer.memoryStorage(); // store in memory
const upload = multer({ storage });
const router = express.Router();

router.post("/", upload.single("userfile"), postChat);
router.get("/", getChats);

module.exports = router;
