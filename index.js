const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
// const path = require('path');
const UserModel = require("./modules/Users");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const authenticateUser = require("./authenticateUser");
require("dotenv").config();

console.log(process.env.JWT_SECRET);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cors());


const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://ebank-app.vercel.app",
    // "https://escrow-app.onrender.com",
    // "https://escrow-app-delta.vercel.app",
    // "https://api.multiavatar.com",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: "Content-Type, Authorization, auth-token",
};

app.use(cors(corsOptions));

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB: ", error);
  });

  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });
// =================== Login

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Request Body:", req.body);
    console.log("Received login request for email:", email);
    const user = await UserModel.findOne({ email: email });

    console.log("Email:", email);
    console.log("User:", user);

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res
        .header("auth-token", token)
        .json({ message: "Login successful!", token });
    } else {
      res.status(401).json({ error: "Invalid Credentials" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ================== Register
app.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      bank,
      dateOfBirth,
      accountNumber,
    } = req.body;

    // Check if the email is already registered
    const existingUser = await UserModel.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash the password before saving it to the database
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create a new user record in MongoDB
    const newUser = new UserModel({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      bank,
      accountNumber,
      dateOfBirth,
    });

    // Save the user to the database
    await newUser.save();

    res.status(200).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to get user details
app.get("/user-details", authenticateUser, async (req, res) => {
  try {
    // Get the user ID from the authenticated user's request object
    const { id: userId } = req.user;

    // Fetch user details from the database based on the user ID
    const user = await UserModel.findById(userId);

    // If the user does not exist, return an error
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return the user details to the client
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.post("/setAvatar", authenticateUser,  upload.single("image"), async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you have user information stored in req.user after authentication
    // const avatarImage = req.file.buffer.toString("base64");
    const avatarImage = req.file.path;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        isAvatarImageSet: true,
        avatarImage: avatarImage,
      },
      { new: true }
    );

    if (updatedUser) {
      res.status(200).json({ success: true, user: updatedUser });
    } else {
      res.status(404).json({ success: false, error: "User not found" });
    }
  } catch (error) {
    console.error("Error setting avatar:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
