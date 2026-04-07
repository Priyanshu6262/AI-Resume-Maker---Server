const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { text, type } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: "Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your .env file." });
        }

        if (!text) {
            return res.status(400).json({ message: "Text to enhance is required." });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using gemini-2.5-flash as it is supported by the API key
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";
        if (type === 'summary') {
            prompt = `Improve the following professional summary for a resume. Make it impactful, concise, and professional. You MUST keep the output UNDER 40 words total. Do NOT write a long paragraph. Return ONLY the improved text, with no quotes or additional formatting. CRITICAL: Do NOT use any line breaks, newlines, or hard wraps. Write as one continuous string:\n\n${text}`;
        } else if (type === 'experience') {
            prompt = `Improve the following job experience description for a resume. Focus on action verbs, quantifiable achievements, and clear phrasing. Return ONLY the improved text, no quotes or additional formatting. CRITICAL: Do NOT hard-wrap sentences. Only use newlines for distinct bullet points:\n\n${text}`;
        } else if (type === 'project') {
            prompt = `Improve the following project description for a resume. Make it highlight technical skills, impact, and problem-solving. Return ONLY the improved text, no quotes or additional formatting. CRITICAL: Do NOT hard-wrap sentences. Only use newlines for distinct bullet points:\n\n${text}`;
        } else {
            prompt = `Improve the following text for a resume to make it more professional. Return ONLY the improved text:\n\n${text}`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let enhancedText = response.text().trim();

        if (type === 'summary') {
            enhancedText = enhancedText.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ');
        }

        res.json({ enhancedText });

    } catch (error) {
        console.error("AI Enhancement Error:", error);
        res.status(500).json({ message: "Failed to enhance text with AI." });
    }
});

router.post('/upload', async (req, res) => {
    try {
        const { fileData, mimeType } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: "Gemini API Key is not configured." });
        }

        if (!fileData || !mimeType) {
            return res.status(400).json({ message: "File data and mimeType are required." });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an expert AI resume parsing assistant. 
Extract all information from the provided resume document. 
Crucially, you must fix any spelling or grammar errors and enhance the professional tone of job descriptions and summaries (make them impactful, concise, and use action verbs). 

Return the extracted and enhanced data ONLY as a valid, strict JSON object matching EXACTLY this schema structure:
{
  "personalInfo": { "fullName": "", "email": "", "phone": "", "address": "", "summary": "", "linkedIn": "", "website": "", "github": "", "twitter": "" },
  "education": [{ "school": "", "degree": "", "startDate": "", "endDate": "", "description": "" }],
  "experience": [{ "company": "", "position": "", "startDate": "", "endDate": "", "description": "" }],
  "skills": [{ "name": "", "level": "Intermediate" }],
  "projects": [{ "name": "", "description": "", "link": "", "technologies": "" }]
}
Do not include any markdown formatting like \`\`\`json. Return raw JSON only.`;

        const imageParts = [
            {
                inlineData: {
                    data: fileData,
                    mimeType
                }
            }
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        let text = response.text().trim();

        // Remove markdown formatting if the model still outputs it
        if (text.startsWith('\`\`\`json')) text = text.substring(7);
        if (text.startsWith('\`\`\`')) text = text.substring(3);
        if (text.endsWith('\`\`\`')) text = text.substring(0, text.length - 3);
        text = text.trim();

        const resumeJSON = JSON.parse(text);
        res.json(resumeJSON);

    } catch (error) {
        console.error("AI Upload Extraction Error:", error);
        res.status(500).json({ message: "Failed to parse resume with AI." });
    }
});

router.post('/generate-from-jd', async (req, res) => {
    try {
        const { jobDescription, requiredSkills, projectDetails } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: "Gemini API Key is not configured." });
        }

        if (!jobDescription) {
            return res.status(400).json({ message: "Job description is required." });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an expert resume writer. Ensure the tone is highly professional and impactful.
Based on the following Job Description and user's context, generate a tailored Professional Summary, a list of relevant Skills, and improved Project Descriptions highlighting the user's fit for this role.

CRITICAL INSTRUCTIONS YOU MUST FOLLOW:
1. SUMMARY LENGTH: The Professional Summary MUST BE EXTREMELY SHORT. You are strictly limited to a MAXIMUM of 40 words (approx. 200 characters). Do not write long paragraphs. If you exceed 40 words, it is a critical failure.
2. PROJECT DESCRIPTION FORMAT: The project description MUST be an actual bulleted list using the '•' symbol. You MUST provide exactly 2 bullet points per project. Separate each bullet point with a newline ('\\n'). Make each bullet point detailed enough to be about 2 lines long.
3. PROJECT NAMES: DO NOT change or invent new project titles. You MUST use the exact project name/title provided by the user in their context.

Job Description & Role Info:
${jobDescription}

Required Skills (Target):
${requiredSkills || 'None provided'}

User's Existing Project Details / Context:
${projectDetails || 'None provided'}

Return the generated content ONLY as a valid JSON object matching EXACTLY this schema structure:
{
  "summary": "Short 40-word impactful summary targeting this role.",
  "skills": [
    "Skill 1", "Skill 2"
  ],
  "projects": [
    { 
      "title": "Exact Original Project Title Provided by User", 
      "description": "• First high-impact bullet point detailing the project and your role.\\n• Second high-impact bullet point detailing the outcomes and technologies used.", 
      "link": "" 
    }
  ]
}
Do not include any markdown formatting like \`\`\`json. Return raw JSON only.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Remove markdown formatting if the model still outputs it
        if (text.startsWith('\`\`\`json')) text = text.substring(7);
        if (text.startsWith('\`\`\`')) text = text.substring(3);
        if (text.endsWith('\`\`\`')) text = text.substring(0, text.length - 3);
        text = text.trim();

        const generatedData = JSON.parse(text);
        res.json(generatedData);

    } catch (error) {
        console.error("AI Generation from JD Error:", error);
        res.status(500).json({ message: "Failed to generate AI content from Job Description." });
    }
});

module.exports = router;
