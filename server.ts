import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";
import PQueue from "p-queue";
import fs from "fs";

// Constants
const PORT = 3000;
const LOG_FILE = path.join(process.cwd(), "sent_log.txt");

// Setup Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Setup Queue (Concurrency 1 ensures sequential sending)
const emailQueue = new PQueue({ concurrency: 1 });

// Queue state tracking
let queueStats = {
  total: 0,
  sent: 0,
  failed: 0,
  isRunning: false,
  cvBuffer: null as Buffer | null,
  cvName: null as string | null,
  logs: [] as string[]
};

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  console.log(`[DEBUG] Starting server in ${process.env.NODE_ENV || "development"} mode`);
  
  app.use(express.json());

  // API Router FIRST to avoid conflicts
  const apiRouter = express.Router();

  apiRouter.get("/status", (req, res) => {
    res.json({
      ...queueStats,
      hasCV: !!queueStats.cvBuffer,
      cvBuffer: undefined // Don't send buffer to client
    });
  });

  apiRouter.post("/upload-cv", upload.single("cv"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    queueStats.cvBuffer = req.file.buffer;
    queueStats.cvName = req.file.originalname;
    addLog(`CV attached: ${req.file.originalname}`);
    res.json({ message: "CV uploaded" });
  });

  let storedRecords: any[] = [];

  apiRouter.post("/upload", upload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    try {
      const records = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true
      });

      storedRecords = records;
      queueStats.total = records.length;
      queueStats.sent = 0;
      queueStats.failed = 0;
      queueStats.logs = [];
      addLog(`File uploaded. Ready to process ${records.length} companies.`);
      res.json({ message: "Upload successful, click Start to begin." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post("/start", (req, res) => {
    if (queueStats.isRunning) return res.status(400).json({ error: "Already running" });
    if (storedRecords.length === 0) return res.status(400).json({ error: "No targets loaded" });

    queueStats.isRunning = true;
    addLog("Bot Engine Started.");

    // Add remaining tasks to queue
    storedRecords.forEach((record: any, index: number) => {
      emailQueue.add(async () => {
        if (!queueStats.isRunning) return;
        await processEmailTask(record, index);
      });
    });

    res.json({ message: "Bot started" });
  });

  apiRouter.post("/stop", (req, res) => {
    emailQueue.clear();
    queueStats.isRunning = false;
    addLog("Bot Engine Stopped.");
    res.json({ message: "Stopped" });
  });

  apiRouter.post("/discover", async (req, res) => {
    const { industry } = req.body;
    try {
      const prompt = `Act as a professional recruiter. List 10 real types of companies or specific regions in Italy for ${industry} work (agriculture, factory, labor). 
      Format as a JSON array of objects: [{ "company_name": "...", "region": "...", "description": "..." }]. 
      Only return the JSON.`;
      
      const result = await model.generateContent(prompt);
      const suggestions = JSON.parse(result.response.text());
      res.json(suggestions);
    } catch (err: any) {
      res.status(500).json({ error: "Discovery failed" });
    }
  });

  app.use("/api", apiRouter);

  // Logging middleware for non-API routes (optional)
  app.use((req, res, next) => {
    next();
  });

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString();
    const fullMsg = `[${time}] ${msg}`;
    queueStats.logs.unshift(fullMsg);
    if (queueStats.logs.length > 50) queueStats.logs.pop();
    
    // Write to file
    fs.appendFileSync(LOG_FILE, fullMsg + "\n");
    console.log(fullMsg);
  }

  async function generatePersonalizedEmail(companyName: string) {
    const prompt = `
      Create a professional job application email for:
      Applicant: Wajdi (36 years old from Tunisia)
      Goal: Working in Italy with visa sponsorship.
      Targets: Agriculture, factory, or general labor.
      Tone: Professional but simple English.
      Context: No specific Italian language skills yet, but hard worker.
      Company applying to: ${companyName}
      
      Requirements:
      1. Mention willingness to work in agriculture, factory, or general labor.
      2. Mention that if they want, I can send my CV.
      3. Keep it short and very clear.
      4. Make it slightly unique to avoid spam filters.
      5. Output ONLY the Subject: line and the Body: content.
    `;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      return `Subject: Job Inquiry - ${companyName}\n\nDear Hiring Manager,\n\nI am Wajdi, 36, from Tunisia. I am looking for work opportunities in Italy (agriculture or factory) with visa sponsorship. I am a hard worker. I can send my CV if you are interested. Thank you.`;
    }
  }

  async function processEmailTask(record: any, index: number) {
    const { email, company_name } = record;
    if (!email || !company_name) return;

    // Random delay: 60-120 seconds
    const delay = Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;
    if (index > 0) {
      addLog(`Waiting ${Math.round(delay/1000)}s before next email...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      const content = await generatePersonalizedEmail(company_name);
      const [subjectLine, ...bodyLines] = content.split("\n");
      const subject = subjectLine.replace("Subject: ", "").trim();
      const body = bodyLines.join("\n").replace("Body:", "").trim();

      await sendEmail(email, subject, body);
      queueStats.sent++;
      addLog(`[${queueStats.sent}/${queueStats.total}] Sent to ${company_name} (${email})`);
    } catch (err: any) {
      queueStats.failed++;
      addLog(`Error sending to ${company_name}: ${err.message}`);
    }

    if (queueStats.sent + queueStats.failed === queueStats.total) {
      queueStats.isRunning = false;
      addLog("Finished processing all emails.");
    }
  }

  async function sendEmail(to: string, subject: string, text: string) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const mailOptions: any = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      text
    };

    if (queueStats.cvBuffer && queueStats.cvName) {
      mailOptions.attachments = [{
        filename: queueStats.cvName,
        content: queueStats.cvBuffer
      }];
    }

    await transporter.sendMail(mailOptions);
  }

  // --- Vite Setup ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    const startupMsg = `[SYSTEM] Server initialized at ${new Date().toISOString()}`;
    fs.appendFileSync(LOG_FILE, startupMsg + "\n");
  });
}

startServer();
