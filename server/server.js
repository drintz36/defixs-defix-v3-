import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/debug', async (req, res) => {
  try {
    const { buggyCode, language } = req.body;

    if (!buggyCode) {
      return res.status(400).json({ error: 'Missing buggyCode in request body' });
    }

    const languageContext = language ? `The code is written in ${language}.\n` : '';
    const prompt = `Act as a Senior Full-Stack Developer with 10+ years of experience. You are the analysis engine for Defix-v2.

STRICT RULE: Return ONLY a valid JSON object. No markdown, no backticks.

JSON STRUCTURE:
{
  "fixed_code": "Full corrected code here",
  "analysis": {
    "issues": ["Detailed text here", "Detailed text here"],
    "how_to_fix": ["Detailed text here", "Detailed text here"],
    "suggestions": ["Detailed text here", "Detailed text here"]
  }
}

CRITICAL FORMATTING RULES:
1. THE "WHY": My UI/CSS is already programmed to automatically put a dash (-) on the screen.
2. NO DASHES: Do NOT start any string with a dash (-), a double dash (--), a dot (.), or a space.
   BAD: "- The variable is wrong"
   GOOD: "The variable is wrong"
3. RAW TEXT ONLY: Every sentence must start directly with a Capital Letter. Do not use any bullet point symbols or numbering.
4. DETAIL: Provide long, deep, and helpful explanations. Do not be short.
5. LANGUAGE: Use simple, professional English.

If you add a dash, it causes a "double dash" glitch in my UI. Only send the raw text sentences.

${languageContext}Code to debug:
${buggyCode}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fixed_code: {
              type: Type.STRING,
              description: "The complete, corrected code.",
            },
            analysis: {
              type: Type.OBJECT,
              properties: {
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                how_to_fix: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["issues", "how_to_fix", "suggestions"]
            }
          },
          required: ["fixed_code", "analysis"],
        },
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const result = JSON.parse(text);

    res.json(result);
  } catch (error) {
    console.error("AI API Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze code. Please try again." });
  }
});

app.use('/defixs-defix-v3-', express.static(path.join(__dirname, '../dist')));
app.use(express.static(path.join(__dirname, '../dist')));

app.get('/defixs-defix-v3-/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`DeFixs backend running on port ${port}`);
});
