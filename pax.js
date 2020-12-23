const crypto = require('crypto');
const express = require('express');
const request = require('request');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');


const uri = "";
const client = new MongoClient(uri);
const apiSecret = '';

app.use(bodyParser.json());


app.use((req, res, next) => {

    // The address verification request doesn't contain the payload and request signature.


    if (!Object.keys(req.body).length && !req.get('X-Paxful-Signature')) {
        console.log('Address verification request received.');
        const challengeHeader = 'X-Paxful-Request-Challenge';
        res.set(challengeHeader, req.get(challengeHeader));
        res.end();
    } else {
        next();
    }
});

app.use((req, res, next) => {
    const providedSignature = req.get('X-Paxful-Signature');
    const calculatedSignature = crypto.createHmac('sha256', apiSecret).update(JSON.stringify(req.body)).digest('hex');
    if (providedSignature !== calculatedSignature) {
        console.log('Request signature verification failed.');
        res.status(403).end();
    } else {
        next();
    }
});

app.post('*', async (req, res) => {
    console.log('New event received:');
    console.log(req.body);
    await client.connect();
    const database = client.db("username");
    const collection = database.collection("data");
    const query = { trade_id: req.body.payload.trade_id };
    const options = {};
    const cursor = collection.find(query, options);

    // print a message if no documents were found
    if ((await cursor.count()) === 0) {
        const doc = { trade_id: req.body.payload.trade_id};
        const result = await collection.insertOne(doc);
        request('http://sendmsg-env.eba-fakpip4q.eu-west-1.elasticbeanstalk.com/?key='+req.body.payload.trade_id, function(err, res, body) {
            console.log(body);
        });
    }


});


app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
