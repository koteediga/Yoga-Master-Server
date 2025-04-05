const express=require('express')

const app=express()
const cors=require('cors');
require('dotenv').config()
const port=process.env.PORT || 3000; //optional port creation
console.log("Db username ",process.env.DB_USER)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
app.use(cors())
app.use(express.json())

// SET TOKEN .
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorize access' })
    }
    const token = authorization?.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ error: true, message: 'forbidden user or token has expired' })
        }
        req.decoded = decoded;
        next()
    })
}



//mongo db connector


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@yogamaster.jzupr.mongodb.net/?retryWrites=true&w=majority&appName=yogamaster`;

// Creating a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	
    await client.connect();

    //create a database and collections
    const database=client.db("yogamaster");
    const userCollection=database.collection("users");
    const classesCollection=database.collection("classes");
    const cartCollection=database.collection("cart");
    const paymentCollection=database.collection("payments");
    const enrolledCollection=database.collection("enroll");
   

// Middleware Functions
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user.role === "admin") {
        next();
      } else {
        return res.status(401).send({error:true,message:"Unauthorize acess"})
      }
    }
    
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user.role == 'instructor' || user.role === 'admin') {
        next();
      } else {
        return res.status(401).send({error:true,message:"Unauthorize acess"})
      }
    }

    app.post('/new-user', async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    })

// user routing
    app.post('/api/set-token', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_SECRET, { expiresIn: '24h' })
           
      res.send({ token })
      console.log({token})
      console.log("token is generated")
        })

    
app.get('/users',async(req,res)=>{
  const query={status:'approved'};
  const result =await userCollection.find().toArray();
  res.send(result);
})
    
    app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const user = await userCollection.findOne(query);
      res.send(result);
    })

      app.get('/users/:email', async (req, res) => {
      const id = req.params.email;
      const query = { email:email }
      const user = await userCollection.findOne(query);
      res.send(result);
})
   
    app.delete("/delete-user/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })


   
// register user
app.post('/register', async (req, res) => {
    const { name, email, photoUrl, role, gender, address, phone, about, skills, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await userCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user object
        const newUser = {
            name,
            email,
            photoUrl,
            role: role || "student",
            gender,
            address,
            phone,
            about,
            skills,
            password: hashedPassword,  
        };

       
        const result = await userCollection.insertOne(newUser);

        // Generate JWT Token
        const token = jwt.sign(
            { userId: result.insertedId, email, role },
            process.env.ACCESS_SECRET || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImtvdGVzd2FyYXJhbzEyMyIsImFnZSI6IjI0IiwiaWF0IjoxNzQzODI5MDIxLCJleHAiOjE3NDM5MTU0MjF9.Xx6PTZCckCNEtlM5UWCsacbLrZeR72OtPb4NgEEWwWA",
            { expiresIn: "1h" }
        );
      console.log("user Register.....!");
        res.status(201).json({
            message: "User registered successfully",
            token,
            userId: result.insertedId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
    // login api
    app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
       
        const user = await userCollection.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

       
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.ACCESS_SECRET || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImtvdGVzd2FyYXJhbzEyMyIsImFnZSI6IjI0IiwiaWF0IjoxNzQzODI5MDIxLCJleHAiOjE3NDM5MTU0MjF9.Xx6PTZCckCNEtlM5UWCsacbLrZeR72OtPb4NgEEWwWA", // Secret key from .env
            { expiresIn: "1h" }  // Token expires in 1 hour
        );
      console.log(token);
      console.log("Login Succesufull");
        res.json({ message: "Login successful", token, role: user.role });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

    
//classes routes here
app.post('/new-class',verifyJWT,verifyInstructor,async(req,res)=>{
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
app.get('/classes/:email',verifyJWT,verifyAdmin,async(req,res)=>{
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
app.put('/change-status/:id',verifyJWT,verifyAdmin,async(req,res)=>{
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
    
    // to get all instructors
     app.get('/instructors', async (req, res) => {
            const query = { role: 'instructor' };
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })

 //updated api entirely

    


 //cart Route !...
   app.post('/add-to-cart',verifyJWT,async(req,res)=>{
    console.log("add -to cart....");
    const newCartItem=req.body;
    const result=await cartCollection.insertOne(newCartItem);
    res.send(result);
   })
    
   // Get cart item id for checking if a class is already in cart
   app.get('/cart-item/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const email = req.query.email;
            const query = { classId: id, userMail: email };
            const projection = { classId: 1 };
            const result = await cartCollection.findOne(query, { projection: projection });
            res.send(result);
        })


    //payment routes
    app.get("/payments", async (req, res) => {
      const query={status:"approved"}
      const result = await paymentCollection.find().toArray();
      console.log("payment is live");
      res.send(result);
   })

    app.post('/payment-info', async (req, res) => {
      const paymentInfo = req.body;
      const classesId = paymentInfo.classesId;
      const userEmail = paymentInfo.userEmail;
      const singleClassId = req.query.classId;
      let query;
      if (singleClassId) {
        query = { classId: singleClassId, userMail: userEmail };
      } else {
        query={classId:{$in:classesId}}
      }

      const classesQuery = { _id: { $in: classesId.map(id => new ObjectId(id)) } }
      const classes = await classesCollection.find(classesQuery).toArray();
      const newEnrolledData = {
        userEmail: userEmail,
        classesId: classesId.map(id => new ObjectId(id)),
        transaction:paymentInfo.transactionId,
      }

      const updateDoc = {
        $set: {
          totalEnrolled: classes.reduce((total, current) => total + current.totalEnrolled, 0) + 1 || 0,
          availableSeats:classes.reduce((total,current)=>total+current.totalEnrolled,0)-1 ||0,
        }
      }

      const updateResult = await classesCollection.updateMany(classesQuery, updateDoc, { upsert: true });
      const enrolledResult = await enrolledCollection.insertOne(newEnrolledData);
      const deletedResult = await cartCollection.deleteMany(query);
      const paymentResult = await paymentCollection.insertOne(paymentInfo);
      res.send({ paymentResult, deletedResult, enrolledResult, updateResult });
      console.log("payment-info api is called")
    })
     app.get('/payment-history/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
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
    res.send("hello koteswararao Backend Server is Running")
})

app.listen(port,()=>{
    console.log(`listining on port ${port}`)
})
