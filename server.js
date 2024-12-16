require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
const readline = require('readline'); 
const bcrypt = require('bcryptjs');
const session = require('express-session');
const User = require('./schemas/User');
const FinanceEntry = require('./schemas/FinanceEntry');app.get
const PORT = process.argv[2] || 3000;
const axios = require('axios');



const mongoUri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@financetracker.6kc43.mongodb.net/?etryWrites=true&w=majority&appName=${process.env.MONGO_DB_NAME}`;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

//Start the server 
const server = app.listen(PORT, () => {
    console.log(`Web server started and running at http://localhost:${PORT}`);
    console.log("Type 'stop' to shut down the server.");
});


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    if (input.trim().toLowerCase() === 'stop') {
        console.log("Shutting down the server...");
        rl.close();
        server.close(() => {
            console.log("Server has been shut down.");
            process.exit(0);
        });
    }
});


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('views'));

// Routes
app.get('/', (req, res) => res.render('auth'));
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));



//logic for sign in and register
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.redirect('/login'); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Error registering user');
    }
});

app.use(
    session({
        secret: 'secret-key',
        resave: false,
        saveUninitialized: false,
    })
);

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (user && (await bcrypt.compare(password, user.password))) {
            req.session.userId = user._id; 
            res.redirect('/dashboard'); 
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error logging in');
    }
});

const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};


//Server side adding finance entries 
app.post('/add-entry', requireAuth, async (req, res) => {
    const { description, amount, category, paymentMethod } = req.body;

    try {
        const entry = new FinanceEntry({
            userId: req.session.userId,
            description,
            amount,
            category,
            paymentMethod,
        });
        await entry.save();
        const entries = await FinanceEntry.find({ userId: req.session.userId }).sort({ date: -1 });
        const user = await User.findById(req.session.userId);

        res.render('dashboard', { user, entries });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding finance entry');
    }
});


// get the entires that the user put in
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login'); 
        }
        const entries = await FinanceEntry.find({ userId: req.session.userId }).sort({ date: -1 });
        res.render('dashboard', { user, entries });
    } catch (err) {
        console.error('Error loading dashboard:', err);
        res.status(500).send('Error loading dashboard');
    }

});

app.get('/api/stocks', requireAuth, async (req, res) => {
    const { symbol } = req.query; // Stock symbol passed in the query

    try {
        const response = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${process.env.FMP_API_KEY}`);
        const stockData = response.data;

        if (stockData.length === 0) {
            return res.status(404).send("Stock symbol not found");
        }

        res.json(stockData); // Return the stock data as JSON
    } catch (err) {
        console.error('Error fetching stock data:', err);
        res.status(500).send('Error fetching stock data');
    }
});