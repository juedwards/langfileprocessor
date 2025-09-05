const express = require('express');
const fetch = require('node-fetch'); // If using Node.js 18+, you can use global fetch instead.
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Allow requests from your frontend

const AZURE_OPENAI_ENDPOINT = "https://exammodels.cognitiveservices.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview";
const AZURE_OPENAI_API_KEY = "56CmLRmWZkP6gZfeEOcj4AWa8S3DqwOi2NSYJ3zqbH04cmTohVKbJQQJ99BFACYeBjFXJ3w3AAAAACOGDTTy";

app.post('/analyze', async (req, res) => {
    const summary = req.body.summary;
    const payload = {
        messages: [
            { role: "system", content: "You are an expert in language file analysis for Minecraft Education Edition." },
            { role: "user", content: `Here is a summary:\n${summary}` }
        ],
        max_tokens: 700
    };
    try {
        const response = await fetch(AZURE_OPENAI_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": AZURE_OPENAI_API_KEY
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        res.json({ result: data.choices[0].message.content });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
