import dotenv from 'dotenv';
dotenv.config();
export const PORT = process.env.PORT || 5555;
export const mongoDBURL = process.env.MONGODB_URL || 
  'mongodb+srv://e-learning:El%40005%24%24..@e-learning-mern.gxwqd33.mongodb.net/e-learning?retryWrites=true&w=majority&appName=E-Learning-MERN';

