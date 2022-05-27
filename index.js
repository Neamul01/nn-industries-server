const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const app = express();

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json());

app.get('/', (req, res) => {
    res.send('N&N Industries surver running...')
})

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "UnAuthorized access" })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gkkzr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('industries').collection('products');
        const reviewCollection = client.db('industries').collection('reviews');
        const orderCollection = client.db('industries').collection('orders');
        const paymentCollection = client.db('industries').collection('payments');
        const userCollection = client.db('industries').collection('users');


        app.post('/create-payment-intent', async (req, res) => {
            const price = req.body.totalPrice;
            const amount = Number(price) * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        //user api's here
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, token })
        })

        //admin api's
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedDoc = {
                $set: {
                    role: "admin",
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        //products api's here
        app.get('/products', async (req, res) => {
            const result = await productCollection.find().toArray();
            res.send(result)
        })

        app.get('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result)
        })

        app.post('/products', verifyJWT, async (req, res) => {
            const result = await productCollection.insertOne(req.body)
            res.send(result)
        })

        app.delete("/products/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result)
        })

        //reviews api's here
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        app.post('/reviews', verifyJWT, async (req, res) => {
            const result = await reviewCollection.insertOne(req.body);
            res.send(result)
        })

        //orders api's here
        app.get('/orders/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const filter = { email: email };
                const result = await orderCollection.find(filter).toArray();
                return res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
        })

        app.get('/orders', verifyJWT, async (req, res) => {
            const result = await orderCollection.find().toArray();
            res.send(result)
        })

        app.get('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            console.log(req.body)
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })

        app.post('/orders', verifyJWT, async (req, res) => {
            const result = await orderCollection.insertOne(req.body);
            res.send(result)
        })

        app.delete('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result)
        })

        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment)
            const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc)
        })

        app.patch('/orders/status/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: true,
                }
            }
            const result = await orderCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

    }
    finally {

    }
}
run().catch(console.dir)

app.listen(port, () => {
    console.log('Server Running on port: ', port)
})