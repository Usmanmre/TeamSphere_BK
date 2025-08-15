// routes/openai.js
import express from "express";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
import multer from "multer";
import pdf from "pdf-parse-new"; // ✅ Simpler, better PDF parsing package

dotenv.config(); // ✅ Load environment variables early

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory

/**
 * Extracts text from a PDF buffer.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(pdfBuffer) {
  const data = await pdf(pdfBuffer);
  return data.text.trim();
}

router.post("/submit", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    // Extract text from PDF
    let pdfText;
    try {
      pdfText = await extractTextFromPDF(req.file.buffer);
    } catch (parseError) {
      return res.status(500).json({
        error: "Failed to extract text from PDF",
        details: parseError.message,
      });
    }

    if (!pdfText) {
      return res.status(400).json({
        error:
          "Could not extract text from PDF. The file might be image-based or corrupted.",
      });
    }

    // AI Model Setup
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-lite",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    const prompt = `Please analyze the following resume text and extract the personal information in the exact JSON format specified. Only return the JSON, no additional text.

Resume Text:
${pdfText}

Please extract and format the information as:
{
  "personal_information": {
    "full_name": "extracted full name",
    "phone_number": "extracted phone number or null if not found",
    "email": "extracted email or null if not found",
    "linkedin_url": "extracted LinkedIn URL or null if not found",
    "portfolio_url": "extracted portfolio URL or null if not found",
    "location": "extracted location or null if not found"
  }
}`;

    const response = await model.call([new HumanMessage(prompt)]);
    const aiResponse = response.content;

    // Extract JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "AI response format invalid" });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      return res.status(500).json({
        error: "Failed to parse AI response",
        details: parseError.message,
      });
    }

    res.json({
      success: true,
      extracted_data: parsedData,
      raw_pdf_text: pdfText.slice(0, 500) + "...", // Limit preview length
    });
  } catch (err) {
    console.error("Error processing PDF:", err);
    res.status(500).json({
      error: "Failed to process PDF",
      details: err.message,
    });
  }
});

export default router;
