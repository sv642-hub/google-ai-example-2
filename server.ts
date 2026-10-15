import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialized server-side Google GenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Multi-turn chat endpoint for data analyst assistant
app.post('/api/analyst/chat', async (req, res) => {
  try {
    const { messages, context, modelChoice } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is not configured. Please set GEMINI_API_KEY in your environment.',
      });
    }

    // Default to gemini-3.8-flash for general analytics tasks, or gemini-3.1-pro-preview / gemini-3.1-flash-lite if requested
    const selectedModel =
      modelChoice === 'pro'
        ? 'gemini-3.1-pro-preview'
        : modelChoice === 'fast'
        ? 'gemini-3.1-flash-lite'
        : 'gemini-3.8-flash';

    const systemInstruction = `You are a senior statistical consultant and expert data science analyst specializing in Econometrics, Linear Regression (OLS), and Unsupervised Clustering (K-Means).

Your role is to help analysts, researchers, and business leaders understand, critique, and extract actionable insights from their regression and clustering findings.

DATA CONTEXT PROVIDED BY USER APP:
${context ? JSON.stringify(context, null, 2) : 'No dataset or model loaded yet.'}

GUIDELINES FOR YOUR RESPONSES:
1. Ground your answers strictly in the provided dataset details, regression equation, coefficients, R-squared, p-values, residuals, and cluster centroids.
2. If discussing regression:
   - Interpret coefficients clearly (e.g. "Each additional unit of X is associated with a β change in Y, holding other predictors constant").
   - Comment on model quality: R², Adjusted R², RMSE, and statistical significance of predictors ($p < 0.05$).
   - Point out potential caveats (multicollinearity, sample size constraints, non-linearity, or outliers).
3. If discussing clustering:
   - Describe cluster personas based on centroid averages (e.g., "Cluster 1 represents high-income, conservative spenders").
   - Discuss separation quality, optimal cluster count (Elbow method), and business strategies for each cluster.
4. Keep explanations crisp, professional, mathematically sound, yet accessible to decision-makers. Use markdown formatting with bullet points and bold text where helpful.`;

    // Convert messages to Gemini contents format
    // role: 'user' | 'model'
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'No response generated.';
    return res.json({ reply, modelUsed: selectedModel });
  } catch (error: any) {
    console.error('Gemini Analyst Chat API Error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred while communicating with Gemini.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
