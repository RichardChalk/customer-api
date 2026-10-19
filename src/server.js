// src/server.js
// Importera biblioteken vi behöver.
require("dotenv").config();
const express = require("express");
const { PrismaClient, Prisma } = require("@prisma/client");

// Skapa en webbserver och en enda Prisma-anslutningsklient.
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Gör så att servern kan läsa JSON från klienten.
app.use(express.json());

// Hjälpfunktion: kontrollera att kunden har giltiga fält.
function validateCustomer(body) {
  const { firstName, lastName, email } = body;
  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    typeof lastName !== "string" ||
    !lastName.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return "Förnamn, efternamn och e-post måste vara text.";
  }
  if (
    firstName.length > 100 ||
    lastName.length > 100 ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return "Kontrollera längderna och e-postadressen.";
  }
  return null; // null betyder att allt är OK.
}

// GET: Hämta alla kunder.
app.get("/api/customers", async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { id: "asc" },
    });
    res.json(customers);
  } catch (error) {
    next(error);
  }
});

// GET: Hämta en kund med id.
app.get("/api/customers/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1)
      return res.status(400).json({ error: "Ogiltigt id." });
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return res.status(404).json({ error: "Kunden finns inte." });
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// POST: Skapa en kund.
app.post("/api/customers", async (req, res, next) => {
  try {
    const message = validateCustomer(req.body);
    if (message) return res.status(400).json({ error: message });
    const { firstName, lastName, email } = req.body;
    const customer = await prisma.customer.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      },
    });
    res.status(201).json(customer); // 201 = resurs skapad.
  } catch (error) {
    next(error);
  }
});

// PUT: Uppdatera hela kunden.
app.put("/api/customers/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1)
      return res.status(400).json({ error: "Ogiltigt id." });
    const message = validateCustomer(req.body);
    if (message) return res.status(400).json({ error: message });
    const { firstName, lastName, email } = req.body;
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      },
    });
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// DELETE: Radera en kund.
app.delete("/api/customers/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1)
      return res.status(400).json({ error: "Ogiltigt id." });
    await prisma.customer.delete({ where: { id } });
    res.status(204).send(); // 204 = lyckat, inget innehåll.
  } catch (error) {
    next(error);
  }
});

// Centralt ställe för felhantering.
app.use((error, req, res, next) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return res.status(409).json({ error: "E-postadressen används redan." });
    if (error.code === "P2025")
      return res.status(404).json({ error: "Kunden finns inte." });
  }
  console.error(error); // Detaljer syns bara på servern.
  res.status(500).json({ error: "Något gick fel på servern." });
});

// Starta API:et. Stäng Prisma-anslutningen vid avslut.
const server = app.listen(PORT, () => {
  console.log(`API körs på http://localhost:${PORT}`);
});
process.on("SIGINT", async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});
