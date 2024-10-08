import express from "express";
import cors from "cors";
import { SummaryTool } from "./tools/SummaryTool";
import { gaia3point1 } from "./chat-models/gaia-llama3point1";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./lib/swagger";
import { port } from "./lib/serverConfig";
import { gaiaGemma } from "./chat-models/gaia-gemma";

const app = express();

app.use(cors());

function authenticateAPIKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const exemptPaths = ["/", "/api-docs"];
  if (exemptPaths.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid API key" });
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
}

app.use(authenticateAPIKey);

const groqSearchTool = new SummaryTool(gaiaGemma);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Returns OK if the service is running
 */
app.get("/", (_, res) => {
  res.send("Ok");
});

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Summarize search results
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: stream
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Whether to stream the response
 *     responses:
 *       200:
 *         description: Returns a summary of the search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *           text/plain:
 *             schema:
 *               type: string
 */
app.get("/search", async (req, res) => {
  const query = req.query.q as string;
  const stream = req.query.stream === "true";

  if (!query) {
    return res.status(400).json({ error: "Missing search query" });
  }

  if (stream) {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    const summaryStream = groqSearchTool.summarizeStream(query);
    for await (const chunk of summaryStream) {
      res.write(chunk);
    }
    res.end();
  } else {
    const summary = await groqSearchTool.summarize(query);
    res.json({ summary });
  }
});

app.listen(port, async () => {
  console.log(`App listening on port ${port}`);
});
