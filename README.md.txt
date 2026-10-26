HunarHub

 Project Overview
HunarHub is a web-based marketplace that connects customers with entrepreneurs and their products or services. It provides role-based access for customers, entrepreneurs, and administrators.

 Technologies Used
- Frontend: React, Vite, JavaScript, CSS
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: JWT-based authentication
- Password Security: bcryptjs

 Main Features
- Customer and entrepreneur authentication
- Entrepreneur profiles and service listings
- Product and service browsing
- Service requests and order management
- Earnings dashboard
- Customer reviews
- Customer complaints and complaint resolution
- Admin analytics and user management
- Admin user suspension and reactivation

 Project Structure
- `frontend/` — React frontend application
- `backend/` — Express backend API
- `README.md` — Project documentation

 Prerequisites
- Node.js and npm
- MongoDB connection
- A modern web browser

 Setup Instructions

 1. Backend
Open a terminal inside the `backend` folder and run:

```bash
npm install
```

Create a `.env` file inside `backend/` using `.env.example` as a reference. Configure the required environment variables:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_private_jwt_secret
```

Start the backend:

```bash
npm run dev
```

 2. Frontend
Open another terminal inside the `frontend` folder and run:

```bash
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal, usually `http://localhost:5173`.

 Environment Variables
Do not share real database credentials or JWT secrets. The `.env.example` files contain sample configuration only.

 Notes
- The backend must connect successfully to MongoDB for database-dependent features to work.
- Keep real `.env` files private and do not include them in the submission ZIP.
- Do not include `node_modules` folders in the submission ZIP.

 Project Status
The project includes customer, entrepreneur, and administrator functionality. 