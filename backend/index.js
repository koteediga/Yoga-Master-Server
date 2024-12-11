const express=require('express')

const app=express()
const cors=require('cors');
require('dotenv').config()
const port=process.env.PORT || 3000;
console.log("Db username ",process.env.DB_USER)

app.use(cors())
app.use(express.json())

//mando db connector


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@yogamaster.jzupr.mongodb.net/?retryWrites=true&w=majority&appName=yogamaster`;

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

    //create a database and collections
    const database=client.db("yogamaster");
    const userCollection=database.collection("users");
    const classesCollection=database.collection("classes");
    const cartCollection=database.collection("cart");
    const paymentCollection=database.collection("payment");
    const enrolledCollection=database.collection("enroll");
    const appliedCollection=database.collection("applied");

//classes routes here
app.post('/new-class',async(req,res)=>{
    const newClass=req.body;
    const result=await classesCollection.insertOne(newClass);
    res.send(result);
})


app.get('/classes',async(req,res)=>{
  const query={status:'approved'};
  const result =await classesCollection.find().toArray();
  res.send(result);
})

//get classes  by insturctor email adress
app.get('/classes/:email',async(req,res)=>{
  const email=req.params.email;
  const query={instructorEmail:email}
  const result =await classesCollection.find(query).toArray();
  res.send(result);
})

//manage classes
app.get('/classes-manage',async(req,res)=>{
  const result =await classesCollection.find().toArray();
  res.send(result);
})

//update classes
app.put('/change-status/:id',async(req,res)=>{
  const id=req.params.id;
  const status=req.body.status;
  const reason=req.body.reason;
  const filter={_id:new ObjectId(id)};
  const options={upsert:true};
  const updateDoc={
    $set:{
      status:status,
      reason:reason,
    },
  }
const result=await classesCollection.updateOne(filter,updateDoc,options)
console.log("updated api called");
res.send(result);
})

//appproved classe
app.get('/approved-classes',async(req,res)=>{
  const query={status:"approved"};
  const result=await classesCollection.find(query).toArray();
  res.send(result);
})

//get single classses
 app.get('/class/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id:id}
  const result=await classesCollection.findOne(query).toArray();
  console.log("single id called")
  res.send(result);
 })

 //updated api entirely


 //cart Route !...
   app.post('/add-to-cart',async(req,res)=>{
    console.log("add -to cart");
    const newCartItem=req.body;
    const result=await cartCollection.insertOne(newCartItem);
    res.send(result);
   })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send("hello world ")
})

app.listen(port,()=>{
    console.log(`listining on port ${port}`)
})