import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Function to create tables if they don't exist
async function createTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            rankings JSONB DEFAULT '{}'
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS player_data (
            id SERIAL PRIMARY KEY,
            player_id VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            team VARCHAR(255),
            position VARCHAR(255),
            projected_points NUMERIC,
            live_points NUMERIC,
            opponent VARCHAR(255),
            matchup_week INT,
            injury_status VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS qb_rankings (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id),
            rankings JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

createTables().catch(err => console.error('Error creating tables:', err));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    store: new (pgSession(session))({
        pool: pool,
        tableName: 'session',
    }),
    secret: 'your-secret-key', // Use a strong secret key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));
app.use(express.static(path.join(__dirname, 'public')));

// Fetch player data from database
async function fetchPlayerDataFromDatabase() {
    const result = await pool.query('SELECT * FROM default_qb_rankings');
    return result.rows;
}

// Endpoint to get player data
app.get('/player-data', async (req, res) => {
    try {
        const data = await fetchPlayerDataFromDatabase();
        res.json(data);
    } catch (err) {
        console.error('Error fetching player data:', err);
        res.status(500).send('Error fetching player data');
    }
});

// Fetch QB rankings for the user
app.get('/api/qb-rankings', async (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).send('Unauthorized');
    }
    try {
        const result = await pool.query('SELECT rankings FROM users WHERE username = $1', [user]);
        if (result.rows.length > 0) {
            res.json(result.rows[0].rankings);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error fetching QB rankings');
    }
});

// Routes for serving HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/qb_rankings.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'qb_rankings.html'));
});

app.get('/friends.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'friends.html'));
});

app.get('/matchup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'matchup.html'));
});

// User registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    console.log('Received registration request:', { username, password });
    try {
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
        req.session.user = username;
        res.send('Registered successfully');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Error registering user');
    }
});

// User login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Received login request:', { username, password });
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            req.session.user = username;
            res.send('Logged in successfully');
        } else {
            res.status(400).send('Invalid credentials');
        }
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Error logging in user');
    }
});

// Add a friend
app.post('/add-friend', async (req, res) => {
    const { friendUsername } = req.body;
    const user = req.session.user;
    if (!user || !friendUsername) {
        return res.status(400).send('Invalid request');
    }
    try {
        await pool.query('INSERT INTO friends (username, friend_username) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user, friendUsername]);
        await pool.query('INSERT INTO friends (username, friend_username) VALUES ($1, $2) ON CONFLICT DO NOTHING', [friendUsername, user]);
        res.send('Friend added successfully');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Error adding friend');
    }
});

// Remove a friend
app.post('/remove-friend', async (req, res) => {
    const { friendUsername } = req.body;
    const user = req.session.user;
    if (!user || !friendUsername) {
        return res.status(400).send('Invalid request');
    }
    try {
        await pool.query('DELETE FROM friends WHERE username = $1 AND friend_username = $2', [user, friendUsername]);
        await pool.query('DELETE FROM friends WHERE username = $1 AND friend_username = $2', [friendUsername, user]);
        res.send('Friend removed successfully');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Error removing friend');
    }
});

// Get friends list
app.get('/get-friends', async (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).send('Unauthorized');
    }
    try {
        const result = await pool.query('SELECT friend_username FROM friends WHERE username = $1', [user]);
        res.json({ friends: result.rows.map(row => row.friend_username) });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Error fetching friends');
    }
});

// Save user rankings
app.post('/save-rankings', async (req, res) => {
    const { rankings } = req.body;
    const user = req.session.user;
    if (!user) {
        return res.status(401).send('Unauthorized');
    }
    try {
        await pool.query('UPDATE users SET rankings = $1 WHERE username = $2', [JSON.stringify(rankings), user]);
        res.send('Rankings saved successfully');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Error saving rankings');
    }
});

// Get user rankings
app.get('/get-rankings', async (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).send('Unauthorized');
    }
    try {
        const result = await pool.query('SELECT rankings FROM users WHERE username = $1', [user]);
        if (result.rows.length > 0) {
            res.json(result.rows[0].rankings);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error fetching rankings');
    }
});

// Get player rankings for matchups
app.get('/get-player-rankings', async (req, res) => {
    try {
        const user = req.session.user;
        const { friend } = req.query;

        if (!user || !friend) {
            return res.status(400).send('Invalid request');
        }

        const userRankingsResult = await pool.query('SELECT rankings FROM users WHERE username = $1', [user]);
        const friendRankingsResult = await pool.query('SELECT rankings FROM users WHERE username = $1', [friend]);

        const userRankings = userRankingsResult.rows.length > 0 ? userRankingsResult.rows[0].rankings : [];
        const friendRankings = friendRankingsResult.rows.length > 0 ? friendRankingsResult.rows[0].rankings : [];

        res.json({ userRankings, friendRankings });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get username
app.get('/get-username', (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).send('Unauthorized');
    }
    res.json({ username: user });
});

// User logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.send('Logged out successfully');
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
