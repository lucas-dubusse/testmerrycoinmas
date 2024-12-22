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
    // SELECT SUM(amount) as total FROM pledges WHERE publicKey = ?
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
    // INSERT INTO pledges (publicKey, amount) VALUES (?, ?)
    await connection.execute(
      `INSERT INTO pledges (publicKey, amount) VALUES (?, ?)`,
      [publicKey, amount]
    );

    await connection.end();
    return res.status(201).send({
      publicKey,
      amount,
      // On ne stocke pas walletBalance dans la DB, c'est juste pour validation
      timestamp: new Date() // on renvoie la date locale (approx)
    });
  } catch (error) {
    console.error('Error in POST /pledgesDB:', error);
    return res.status(500).send({ error: 'Internal server error.' });
  }
});

// ROUTE : GET /pledgesDB (récupérer les 10 derniers pledges)
app.get('/pledgesDB', async (req, res) => {
  try {
    // Connexion à la DB
    const connection = await mysql.createConnection(dbConfig);

    // SELECT * FROM pledges ORDER BY created_at DESC LIMIT 10
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

// ROUTE Optionnelle si vous avez un /total-pledged
// (Récupérer le total des SOL pledgés)
app.get('/total-pledged', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT SUM(amount) as total FROM pledges`
    );
    await connection.end();
    const total = rows[0].total || 0;
    return res.send({ total });
  } catch (error) {
    console.error('Error in GET /total-pledged:', error);
    return res.status(500).send({ error: 'Internal server error.' });
  }
});

// Lancement du serveur
const PORT = 3000; // ou un autre port de votre choix
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
