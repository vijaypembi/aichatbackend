const { GoogleGenAI } = require("@google/genai");

const dotenv = require("dotenv");
dotenv.config();

const getAIResponse = async (prompt) => {
    // console.log("Prompt:", prompt);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
    });
    // console.log(response);
    return response;
};

module.exports = getAIResponse;
