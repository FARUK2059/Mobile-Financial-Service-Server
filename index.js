const express = require("express");
const cors = require('cors');
require('dotenv').config();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const bodyParser = require('body-parser');



const app = express();
const port = process.env.PORT || 5000;


// Midleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://readypay.vercel.app'
    ],
    credentials: true
}));
app.use(express.json());

// MongoDB Conection Method
const uri = `mongodb+srv://${process.env.ENV_READYPAY_USER}:${process.env.ENV_READYPAY_PASSWORD}@cluster0.6e55rfm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // Database name Creat
        const userCollection = client.db('ReadyPay').collection('user-info');

        // ***************  Veryfy secure JWT API Funtionality ********************

        // JWT Token generation
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // Middleware to verify token
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' });
                }
                req.decoded = decoded;
                next();
            });
        };


        // *****************    Admin Funtionality  *******************


        // Aproval admin
        app.patch('/activate/:id', verifyToken, async (req, res) => {
            const userId = req.params.id;
            const result = await userCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: { status: 'active', balance: 40 } }
            );
            res.send(result);
        });


        //  ***************  user funtionality **************

        // Registration User
        app.post('/register', async (req, res) => {
            const { name, pin, mobile, email } = req.body;

            const existingUser = await userCollection.findOne({ email });
            if (existingUser) {
                return res.status(400).send({ message: 'User already exists' });
            }

            const hashedPin = await bcrypt.hash(pin, 10);
            const newUser = { name, pin: hashedPin, mobile, email, status: 'pending', balance: 0 };
            const result = await userCollection.insertOne(newUser);
            res.send(result);
        });


        // User Login 
        app.post('/login', async (req, res) => {
            const { email, pin } = req.body;
            const user = await userCollection.findOne({ email });

            if (!user) {
                return res.status(400).send({ message: 'Invalid credentials' });
            }

            const isPinValid = await bcrypt.compare(pin, user.pin);
            if (!isPinValid) {
                return res.status(400).send({ message: 'Invalid credentials' });
            }

            const token = jwt.sign({ email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });


        // User Logout
        app.post('/logout', (req, res) => {
            res.send({ message: 'Logged out successfully' });
        });

















        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




// Main Server Function
app.get('/', (req, res) => {
    res.send('Mobile Financial Service is Started')
})

app.listen(port, () => {
    console.log(`Financial user Port : ${port}`);
})