/**
 * Simple static file server for the chat frontend
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

app.listen(port, () => {
    console.log(`Frontend server running at http://localhost:${port}`);
});
