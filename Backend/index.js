const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const pool = new Pool({
  user: 'yocity',           
  host: 'localhost',        
  database: 'taches',       
  password: 'yocity',      
  port: 5432,              
  max: 20,                  // Nombre max de connexions
  idleTimeoutMillis: 30000, // Timeout des connexions inactives
  connectionTimeoutMillis: 2000, // Timeout de connexion
});

// Test simple
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Erreur de connexion:', err);
  } else {
    console.log('Connexion réussie:', result.rows[0]);
  }
});

// Test avec votre table
pool.query('SELECT COUNT(*) FROM tasks', (err, result) => {
  if (err) {
    console.error('Erreur requête:', err);
  } else {
    console.log('Nombre de tâches:', result.rows[0].count);
  }
}); 

app.use(cors());
app.use(express.json());

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, due_date, priority } = req.body;
    if (!title) return res.status(400).json({ error: 'Titre requis' });
    
    const result = await pool.query(
      'INSERT INTO tasks (title, description, due_date, priority, completed) VALUES ($1, $2, $3, $4, false) RETURNING *',
      [title, description, due_date, priority || 'moyenne']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tâche non trouvée' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { title, description, due_date, priority, completed } = req.body;
    if (!title) return res.status(400).json({ error: 'Titre requis' });
    
    const result = await pool.query(
      'UPDATE tasks SET title = $1, description = $2, due_date = $3, priority = $4, completed = $5 WHERE id = $6 RETURNING *',
      [title, description, due_date, priority || 'moyenne', completed || false, req.params.id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tâche non trouvée' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tasks/:id/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE tasks SET completed = NOT completed WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tâche non trouvée' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tâche non trouvée' });
    res.json({ message: 'Tâche supprimée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Paramètre q requis' });
    
    const result = await pool.query(
      'SELECT * FROM tasks WHERE title ILIKE $1 OR description ILIKE $1',
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM tasks');
    const completed = await pool.query('SELECT COUNT(*) FROM tasks WHERE completed = true');
    
    res.json({
      total: parseInt(total.rows[0].count),
      completed: parseInt(completed.rows[0].count),
      pending: parseInt(total.rows[0].count) - parseInt(completed.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Serveur sur le port ${port}`);
});

module.exports = app;