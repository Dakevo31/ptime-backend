// index.js
// Redeploy again for Firebase key fix
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
// ✅ Corregir saltos de línea
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
app.use(cors({
  origin: "https://ptime.cloud",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Ruta para crear usuario
app.post("/create-user", async (req, res) => {
  const { fullName, email, password, role, companyId } = req.body;

  if (!fullName || !email || !password || !role || !companyId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Crear el usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });

    const uid = userRecord.uid;

    // 2. Guardar en Firestore
    await db.doc(`companies/${companyId}/users/${uid}`).set({
      uid,
      fullName,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    // 3. Crear en lookupUsers
    await db.doc(`lookupUsers/${uid}`).set({ companyId });

    return res.status(200).json({ message: "User created", uid });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
