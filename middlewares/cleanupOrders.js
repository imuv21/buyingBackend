import cron from 'node-cron';
import { Order } from '../models/User.js';

// Schedule a job to run on the 1st day of every month at midnight
cron.schedule('0 0 1 * *', async () => {
    try {
        const result = await Order.deleteMany({ status: 'Created' });
        console.log(`Monthly Cleanup: Deleted ${result.deletedCount} orders with status "Created".`);
    } catch (error) {
        console.error('Error during monthly order cleanup:', error);
    }
});
