const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
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

        app.post('/products', async (req, res) => {
            const result = await productCollection.insertOne(req.body)
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