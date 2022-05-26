const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json());

app.get('/', (req, res) => {
    res.send('N&N Industries surver running...')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gkkzr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('industries').collection('products');
        const reviewCollection = client.db('industries').collection('reviews');
        const orderCollection = client.db('industries').collection('orders');
        const paymentCollection = client.db('industries').collection('payments');


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

        //products api's here
        app.get('/products', async (req, res) => {
            const result = await productCollection.find().toArray();
            res.send(result)
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result)
        })

        app.post('/products', async (req, res) => {
            const result = await productCollection.insertOne(req.body)
            res.send(result)
        })

        //reviews api's here
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        app.post('/reviews', async (req, res) => {
            const result = await reviewCollection.insertOne(req.body);
            res.send(result)
        })

        //orders api's here
        app.get('/orders', async (req, res) => {
            const result = await orderCollection.find().toArray();
            res.send(result)
        })

        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            console.log(req.body)
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })

        app.post('/orders', async (req, res) => {
            const result = await orderCollection.insertOne(req.body);
            res.send(result)
        })

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result)
        })

        app.patch('/orders/:id', async (req, res) => {
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

    }
    finally {

    }
}
run().catch(console.dir)

app.listen(port, () => {
    console.log('Server Running on port: ', port)
})