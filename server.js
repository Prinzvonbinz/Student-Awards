const express = require("express");
const path = require("path");
const app = express();

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/vote.html", (req, res) => {
  res.sendFile(path.join(__dirname, "vote.html"));
});

app.get("/result.html", (req, res) => {
  res.sendFile(path.join(__dirname, "result.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
