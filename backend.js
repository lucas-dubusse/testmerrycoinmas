/************************************************************
 * Installer les dépendances :
 *   npm install express cors mysql2
 *
 * Lancer votre serveur avec :
 *   node backend.js
 *
 * Accéder aux routes :
 *   POST /pledgesDB  => ajoute un pledge
 *   GET  /pledgesDB  => récupère les 10 derniers pledges
 ************************************************************/

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Bibliothèque MySQL2 (mode async/await)

// Créer l'application Express
const app = express();
app.use(cors());
app.use(express.json());

// Configuration de la connexion MySQL
// (Remplacez ces informations par vos identifiants réels)
const dbConfig = {
  host: 'localhost',
  user: 'merryuser',
  password: 'merrypass',
  database: 'merrydb',
  port: 3306
};

// ROUTE : POST /pledgesDB (ajouter un pledge)
app.post('/pledgesDB', async (req, res) => {
  try {
    const { publicKey, amount, walletBalance } = req.body;

    if (!publicKey || !amount) {
      return res
        .status(400)
        .send({ error: 'Public key and amount are required.' });
    }
    if (typeof walletBalance !== 'number') {
      return res
        .status(400)
        .send({ error: 'walletBalance is required and must be a number.' });
    }

    // Connexion à la DB
    const connection = await mysql.createConnection(dbConfig);

    // Récupérer la somme déjà pledgée par ce publicKey
    const [rows] = await connection.execute(
      `SELECT SUM(amount) as total FROM pledges WHERE publicKey = ?`,
      [publicKey]
    );

    const totalPledgedSoFar = rows[0].total || 0;

    // Vérifier si le nouveau pledge dépasse le solde total du wallet
    if (totalPledgedSoFar + amount > walletBalance) {
      await connection.end();
      return res
        .status(400)
        .send({ error: 'Pledge exceeds your total wallet balance.' });
    }

    // Insérer le nouveau pledge
    await connection.execute(
      `INSERT INTO pledges (publicKey, amount) VALUES (?, ?)`,
      [publicKey, amount]
    );

    await connection.end();
    return res.status(201).send({
      publicKey,
      amount,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in POST /pledgesDB:', error);
    return res.status(500).send({ error: 'Internal server error.' });
  }
});

// ROUTE : GET /pledgesDB (récupérer les 10 derniers pledges)
app.get('/pledgesDB', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `SELECT id, publicKey, amount, created_at 
       FROM pledges 
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    await connection.end();
    return res.send(rows);
  } catch (error) {
    console.error('Error in GET /pledgesDB:', error);
    return res.status(500).send({ error: 'Internal server error.' });
  }
});

// ROUTE Optionnelle /total-pledged
app.get('/total-pledged', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT SUM(amount) as total FROM pledges`
    );
    await connection.end();
    const total = rows[0].total || 0;
    total = Number(total);
    return res.send({ total });
  } catch (error) {
    console.error('Error in GET /total-pledged:', error);
    return res.status(500).send({ error: 'Internal server error.' });
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
