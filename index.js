const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.shfwl8n.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();
    const userCollection = client.db('bloodDonation').collection("users")
    const blogsCollection = client.db('bloodDonation').collection("blogs")
    const donationRequestsCollection = client.db('bloodDonation').collection("donationRequests")




    // jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token });
    })


    // user api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    })


    // Donation Request
    app.post('/donation-requests', async (req, res) => {
      const donationRequests = req.body;
      const result = await donationRequestsCollection.insertOne(donationRequests)
      res.send(result);
    })

    app.get('/donation-requests', async (req, res) => {
      const cursor = donationRequestsCollection.find()
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/donation-requests/:status', async (req, res) => {
      const status = req.params.status;

     
      if (status === 'All Request') {
        const cursor = donationRequestsCollection.find()
        const result = await cursor.toArray();
        res.send(result)
      }
      else {
        const query = { status: status }
        const result = await donationRequestsCollection.find(query).toArray()
        res.send(result)
      }
    })

    // user donation-requests
     app.get('/user-donation-request/:email', async (req, res) =>{
      const email = req.params.email
      console.log(email);
      console.log(req.params);
      const query = { requesterEmail: email }
      const cursor = donationRequestsCollection.find(query)
      const result = await cursor.toArray()
      res.send(result);
     })

    // update

    app.get('/update-request/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await donationRequestsCollection.find(query).toArray()
      res.send(result);
    })
    app.put('/donation-requests/:id', async (req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const option = {upsert: true};
      const updateDonationRequest = req.body;
      const updateInfo = {
        $set:{
        requesterName: updateDonationRequest.requesterName,
        requesterEmail: updateDonationRequest.requesterEmail,
        recipientName: updateDonationRequest.recipientName,
        hospitalName: updateDonationRequest.hospitalName,
        recipientDistrict: updateDonationRequest.recipientDistrict,
        recipientUpazila: updateDonationRequest.recipientUpazila,
        fullAddress: updateDonationRequest.fullAddress,
        donationDate: updateDonationRequest.donationDate,
        donationTime: updateDonationRequest.donationTime,
        message: updateDonationRequest.message,
        }
      }
      const result = await donationRequestsCollection.updateOne(filter, updateInfo, option)
      res.send(result)
    })

    app.delete('/donation-requests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donationRequestsCollection.deleteOne(query);
      res.send(result);
    })




    //Blog api
    app.post('/blogs', async (req, res) => {
      const blog = req.body;
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    })
    app.get('/blogs', async (req, res) => {
      const cursor = blogsCollection.find()
      const result = await cursor.toArray();
      res.send(result)
    })

    app.delete('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await blogsCollection.deleteOne(query);
      res.send(result);
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Blood Donation Server')
})

app.listen(port, () => {
  console.log(`Blood Donation Server is running on port ${port}`);
})