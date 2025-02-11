import './middlewares/cleanupOrders.js';
import { createServer } from "http";
import { app } from "./app.js";
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV;
const server = createServer(app);

// Listening to ports
server.listen(PORT, () => {
    if (NODE_ENV !== 'pro') {
        console.log(`Server listening at http://localhost:${PORT}`);
    } else {
        console.log('Server is running in production mode');
    }
});