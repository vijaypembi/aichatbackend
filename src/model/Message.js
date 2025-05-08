const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    senderId: String,
    sender: String,
    text: String,
    responseType: {
        type: String,
        enum: [
            "text",
            "json",
            "file",
            "image",
            "audio",
            "video",
            "meta",
            "error",
            "html",
            "table",
            "code",
            "markdown",
            "link",
            "list",
            "raw",
            "docAnalysis",
            "form",
        ],
        default: "text",
    },
    extraData: mongoose.Schema.Types.Mixed,
    fileInfo: {
        filename: String,
        mimetype: String,
        data: Buffer,
    },
    extractedText: String,
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);

// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema({
//     sender: String,
//     text: String,
//     createdAt: { type: Date, default: Date.now },
//     entryTimestamp: { type: Date, required: true },
// });
// const Message = mongoose.model("Message", messageSchema);

// module.exports = Message;
