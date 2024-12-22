const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Modèle de Pledge
const pledgeSchema = new mongoose.Schema({
  publicKey: String,
  amount: Number,
  timestamp: { type: Date, default: Date.now },
});

const Pledge = mongoose.model('Pledge', pledgeSchema);

// Connexion à MongoDB
mongoose
  .connect('mongodb://127.0.0.1:27017/pledgesDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

// Route pour ajouter un pledge
app.post('/pledgesDB', async (req, res) => {
  const { publicKey, amount, walletBalance } = req.body;

  if (!publicKey || !amount) {
    return res.status(400).send({ error: 'Public key and amount are required.' });
  }

  if (typeof walletBalance !== 'number') {
    return res.status(400).send({ error: 'walletBalance is required and must be a number.' });
  }

  const aggregationResult = await Pledge.aggregate([
    { $match: { publicKey: publicKey } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const totalPledgedSoFar = (aggregationResult.length > 0) ? aggregationResult[0].total : 0;

  if (totalPledgedSoFar + amount > walletBalance) {
    return res.status(400).send({ error: 'Pledge exceeds your total wallet balance.' });
  }

  const pledge = new Pledge({ publicKey, amount });
  await pledge.save();
  res.status(201).send(pledge);
});

// Route pour récupérer les 10 derniers pledges
app.get('/pledgesDB', async (req, res) => {
  const pledges = await Pledge.find().sort({ timestamp: -1 }).limit(10);
  res.send(pledges);
});

// Route pour obtenir le total des SOL pledgés
app.get('/total-pledged', async (req, res) => {
  const aggregationResult = await Pledge.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const total = (aggregationResult.length > 0) ? aggregationResult[0].total : 0;
  res.send({ total });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
