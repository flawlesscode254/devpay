const express = require("express");
const cors = require("cors");
const axios = require("axios");
const firebase = require("firebase");
const { fetch } = require("cross-fetch");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const firebaseConfig = {
  apiKey: "AIzaSyAHZXBp0Pgl9jd6R7V-Ps-NYXnHOTOJ_cI",
  authDomain: "commerce-4155c.firebaseapp.com",
  projectId: "commerce-4155c",
  storageBucket: "commerce-4155c.appspot.com",
  messagingSenderId: "980932838893",
  appId: "1:980932838893:web:9f4df4224df5139f9153e4",
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`App started on http://localhost:${port}`);
});

app.get("/", (req, res) => {
  res.json({
    message: "Entry file",
  });
});

const getAccessToken = async (req, res, next) => {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const payments = process.env.PAYMENT_URL;
  const auth = new Buffer.from(`${key}:${secret}`).toString("base64");

  await axios
    .get(`${payments}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        authorization: `Basic ${auth}`,
      },
    })
    .then((res) => {
      access_token = res.data.access_token;
      next();
    })
    .catch((err) => {
      console.log(err);
    });
};

let transactionIDRef;

app.post("/stk", getAccessToken, async (req, res) => {
  let { phone_number, cash, transactionID } = req.body;

  transactionIDRef = transactionID;

  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  const shortCode = process.env.MPESA_PAYBILL;
  const passkey = process.env.MPESA_PASSKEY;
  const payments = process.env.PAYMENT_URL;
  const callbackurl = process.env.CALLBACK_URL;

  const password = new Buffer.from(shortCode + passkey + timestamp).toString(
    "base64"
  );

  await fetch(`${payments}/mpesa/stkpush/v1/processrequest`, {
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: cash,
      PartyA: phone_number,
      PartyB: shortCode,
      PhoneNumber: phone_number,
      CallBackURL: `${callbackurl}/stk_callback`,
      AccountReference: phone_number,
      TransactionDesc: "Payments",
    }),
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
  })
    .then((resp) => {
      res.json(resp.data);
    })
    .catch((err) => {
      res.json(err);
    });
});

app.post("/stk_callback", async (req, res) => {
  let better = req.body.Body.stkCallback;
  await db
    .collection("status")
    .doc(transactionIDRef)
    .get()
    .then(async (doc) => {
      if (doc.exists) {
      } else {
        await db.collection("status").doc(transactionIDRef).set({
          message: better.ResultDesc,
        });
      }
    });
});
