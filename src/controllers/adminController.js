// const FileType = require("file-type");

const getAIResponse = require("../middleware/getAIResponse");
const Message = require("../model/Message");

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const textract = require("textract");
const XLSX = require("xlsx");
const util = require("util");

const extractWithTextract = util.promisify(textract.fromBufferWithMime);

const getExtractedText = async (file) => {
    const { mimetype, buffer } = file;

    if (mimetype === "application/pdf") {
        const data = await pdfParse(buffer);
        return data.text;
    } else if (
        mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } else if (mimetype === "application/msword") {
        return await extractWithTextract(mimetype, buffer);
    } else if (
        mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        let result = "";

        workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_csv(sheet);
            result += `${data}\n`;
        });

        return result.trim();
    } else if (mimetype === "text/plain") {
        return buffer.toString("utf-8");
    } else {
        return "";
    }
};

const postChat = async (req, res) => {
    try {
        // input text from user
        const userText = req.body.text || "";
        // console.log("userText", userText);

        const userFile = req.file || null;
        // console.log("userFile", userFile);
        const userId = `admin-${req.user?._id}` || "123";
        // OR input file from user by req.file//
        // fileInfo: userFileInfo,
        // console.log("admin-", req.user?.role.toString());
        let userFileInfo = null;
        if (userFile) {
            userFileInfo = {
                filename: req.file.originalname, // For display/download
                mimetype: req.file.mimetype, // For setting correct headers later
                data: req.file.buffer,
            };
        }
        // previously saved data from MongoDB storage,
        // based on userId and ai-userId in the senderId field.

        const docs = await Message.find({
            $or: [
                { senderId: userId },
                { senderId: `ai-${userId}` },
                { senderId: `admin-${userId}` },
            ],
        }).sort({ createdAt: -1 });

        // console.log("admin-docs", docs);
        // console.log("doc", docs.length > 0);
        const context = docs
            .map((doc) => {
                const extraData =
                    JSON.stringify(doc.extraData) !== "null"
                        ? JSON.stringify(doc.extraData)
                        : "";

                const filePart =
                    JSON.stringify(doc.fileInfo) !== "null"
                        ? JSON.stringify(doc.fileInfo)
                        : "";
                const extractedText = JSON.stringify(doc.extractedText)
                    ? JSON.stringify(doc.extractedText)
                    : "";

                const textPart =
                    typeof doc.text === "string" ? doc.text.trim() : "";

                // Combine only non-empty parts
                return [filePart, extraData, textPart, extractedText]
                    .filter(Boolean)
                    .join("\n");
            })
            .filter(Boolean) // remove completely empty mapped results
            .join("\n\n");
        // console.log("context", context);
        const extractedText = userFile ? await getExtractedText(req.file) : "";
        // console.log("extractedText", extractedText);
        const fileInfo = userFileInfo
            ? `Uploaded File: ${userFileInfo.originalname} (${userFileInfo.mimetype})`
            : "";

        const prompt = `You are a helpful assistant. Answer the question based on the context provided.\n\nContext:\n${
            context || "no previous context available"
        }\n\nQuestion:\n${userText}\n\n${fileInfo}\n\nDocument Content:\n${extractedText}\n\nAnswer:`;

        const aiResponse = await getAIResponse(prompt); // right now i am using GeminiAI
        // console.log("aiResponseType", aiResponse);
        // res.status(200).json({ chatHistory: aiResponse });
        // console.log("aiResponse", aiResponse.text);
        console.log("admin-", req.user?.role.toString());

        const userMessage = new Message({
            senderId: userId,
            sender: req.user?.role.toString() || "admin",
            text: userText,
            responseType: userFile ? userFile.mime : "text", //if it null that means only text
            extraData: null, // it is not necessary to user , ai give the json data so right now it is empty
            fileInfo: userFileInfo,
            extractedText: userFile ? extractedText : "",
            createdAt: Date.now(),
        });

        // i am expecting 3 different types of responseTypes text, file, mixedData, fom aiResponse

        // Step 1: Use declared mime, or fallback
        const declaredMime = aiResponse.mime || "text";

        // Step 2: Determine if it's a special data type (not plain text or file)
        const isAnotherDataType =
            declaredMime !== "text" && declaredMime !== "file";

        // Step 3: Create Message model instance
        const aiMessage = new Message({
            senderId: `ai-${userId}`,
            sender: "ai",
            text: aiResponse.text || "",
            responseType: declaredMime,
            extraData: isAnotherDataType ? aiResponse : null,
            fileInfo: declaredMime === "file" ? aiResponse.file : null,
            extractedText:
                declaredMime === "file"
                    ? getExtractedText(aiResponse.file)
                    : "",
            createdAt: Date.now(),
        });

        await userMessage.save();
        await aiMessage.save();

        const recentDocs = await Message.find({
            $or: [
                { senderId: userId },
                { senderId: `ai-${userId}` },
                { senderId: `admin-${userId}` },
            ], // admin uploads are not necessary to show in chat history
        }).sort({ createdAt: -1 });

        res.status(200).json({
            message: "success",
            chatHistory: recentDocs,
        });
    } catch (err) {
        console.error("Error in postChat:", err);
        res.status(500).json({ message: `Internal server error ${err}` });
    }
};

const getChats = async (req, res) => {
    try {
        const userId = req.user?._id.toString() || "123";
        // console.log("userId-admin", userId);
        const chatHistory = await Message.find({
            $or: [
                { senderId: userId },
                { senderId: `ai-${userId}` },
                { senderId: `admin-${userId}` },
            ], // admin uploads are not necessary to show in chat history
        }).sort({ createdAt: -1 });
        console.log("chatHistory", chatHistory);
        if (!chatHistory.length) {
            return res.status(404).json({ message: "No chat history found" });
        }

        return res.status(200).json({
            message: "success",
            chatHistory,
        });
    } catch (err) {
        console.error("Error in getChats:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { postChat, getChats };
