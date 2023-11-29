const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
    const moneyDonarCollection = client.db('bloodDonation').collection("moneyDonar")
    const donationRequestsCollection = client.db('bloodDonation').collection("donationRequests")

    //payment api
    app.post('/create-payment-intent', async (req, res)=>{
      const {price} = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the');
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency: 'usd',
        payment_method_types: ['card']
      })

      res.send({ 
        clientSecret: paymentIntent.client_secret
      })
    })

    app.post('/money-donar-list', async (req, res) =>{
      const moneyDonarList = req.body
      const result = await moneyDonarCollection.insertOne(moneyDonarList)
      res.send(result)
    })


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

    // middlewares 
    // const verifyToken = (req, res, next) =>{
    //   console.log('insider token',req.headers.authorization);
    //   if(!req.headers.authorization){
    //     return res.status(401).send({message: 'forbidden access'})
    //   }
    //   const token = req.headers.authorization.split(' ')[1]
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded) =>{
    //     if(err){
    //       return res.status(401).send({message: 'forbidden access'})
    //     }
    //     req.decoded = decoded;
    //     next();
    //   })
    // }


    app.get('/users', async (req, res)=>{
      const cursor = userCollection.find()
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/user/admin/:email',  async (req, res) =>{

      const email = req.params.email
      const query = {email: email}
      const users = await userCollection.findOne(query)
      let admin = false;
      if (users){
        admin = users.role === 'Admin'
      }

      res.send({admin});

    })



    app.get('/myInfo/:email', async (req, res)=>{
      const email = req.params.email;
      const query = { email: email }
        const result = await userCollection.find(query).toArray()
        res.send(result)
    })

    app.put('/users/:id', async (req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true}
      const updatedRole = req.body;

      const newRole = {
        $set:{
          role: updatedRole.role
        }
      }
      const result = await userCollection.updateOne(filter, newRole, options)
      res.send(result);
    })

    app.put('/users-status/:id', async (req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true}
      const updatedStatus = req.body;

      const newStatus = {
        $set:{
          status: updatedStatus.status
        }
      }
      const result = await userCollection.updateOne(filter, newStatus, options)
      res.send(result);
    })


    app.put('/update-usersInfo/:id', async (req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true}
      const userInfo = req.body;

      const newStatus = {
        $set:{
          name: userInfo.name,
          avatar: userInfo.avatar,
          district: userInfo.district,
          bloodGroup: userInfo.bloodGroup,
          upazila: userInfo.upazila
        }
      }
      const result = await userCollection.updateOne(filter, newStatus, options)
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


    app.get('/pending-requests/:pending', async (req, res) => {
      const pending = req.params.pending;
        const query = { status: pending }
        const result = await donationRequestsCollection.find(query).toArray()
        res.send(result)
      
    })

    // user donation-requests
     app.get('/user-donation-request/:email', async (req, res) =>{
      const email = req.params.email
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


    app.put('/donation-info/:id', async (req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const option = {upsert: true};
      const updateDonarInfo = req.body;
      const updateInfo = {
        $set:{
        status: updateDonarInfo.status,
        donarInfo: updateDonarInfo.info,
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

    app.get('/blogs-published/:status', async (req, res) => {

      const status = req.params.status
      const query = { status: status }
      const result = await blogsCollection.find(query).toArray()
      res.send(result);
    })

    app.get('/blogs/:id', async (req, res) => {

      const id = req.params.id
      const query = { _id: new ObjectId(id)}
      const result = await blogsCollection.findOne(query)
      res.send(result);
    })

    app.delete('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await blogsCollection.deleteOne(query);
      res.send(result);
    })

    app.put('/blogs/:id', async (req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const option = {upsert: true};
      const update = req.body;
      const updateInfo = {
        $set:{
        status: update.status,
        }
      }
      const result = await blogsCollection.updateOne(filter, updateInfo, option)
      res.send(result)
    })

    // image upload


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