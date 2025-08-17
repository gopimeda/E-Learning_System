import dotenv from 'dotenv';
dotenv.config();
export const PORT = process.env.PORT || 5555;
export const mongoDBURL = 'mongodb://127.0.0.1:27017/e-learning';
