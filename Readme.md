# 🚗Garage Manager API
### Node.js · Express · MongoDB · Cloudinary

RESTful API developed for the Backend module.  
It includes full user management, JWT authentication, role-based permissions, CRUD operations for cars, image uploads with Cloudinary, and a database seeding system.

---

## 🛠 Technologies Used

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)
![Nodemon](https://img.shields.io/badge/Nodemon-dev%20server-76D04B?style=for-the-badge)

- **Node.js** – Backend runtime environment  
- **Express** – REST API framework  
- **MongoDB Atlas** – Cloud database  
- **Mongoose** – ODM for MongoDB  
- **Cloudinary** – Image storage and management  
- **Nodemon** – Development server  

---

## ⚙ Installation & Usage

```bash
git clone https://github.com/serxa92/Backend.git
cd Backend
npm install
npm run dev
```
Server will run on:

```bash
http://localhost:8080
```
## 📦 API Endpoints
🚘 Car Endpoints
```bash
GET /cars => Returns all cars.
````
````bash
POST /cars => Creates a new car (Authentication required).
`````

Example body:
```json
{
  "brand": "volkswagen",
  "model": "golf gti 35 edition",
  "year": 2011,
  "mileage": 150000
}
```
````bash
GET /cars/:id => Returns a car by its ID.

PUT /cars/:id => Updates a car.

DELETE /cars/:id => Deletes a car.

GET /cars/brand/:brand => Returns cars filtered by brand (case-insensitive).
````

## 🔐 Authentication
- POST /auth/register

- Registers a new user (default role: user).

- Supports image upload using multipart/form-data.

- POST /auth/login

- Returns JWT token.

## 👥 Role-Based Permissions

- user → Can manage own data.

- admin → Can change user roles and delete any account.

## ☁ Cloudinary Integration

- Image uploaded on user registration.

- Image URL stored in database.

- Image automatically deleted from Cloudinary when user is removed.

## 👨‍💻 Author

Sergio Agulla
