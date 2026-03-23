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
    const prompt = `Analyze the user's code. Return ONLY a JSON object with this keys: 'fixed_code' (string), 'analysis' (object containing 'issues', 'how_to_fix', 'suggestions' as arrays of strings). Use professional English.

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
