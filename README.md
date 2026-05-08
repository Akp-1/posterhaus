# PosterHaus 🖼️

PosterHaus is a minimalist, high-performance e-commerce prototype designed for selling posters. It features a sleek vanilla JS storefront, an administrative dashboard for order management, and a robust MySQL backend.

## 🚀 Key Features
- **Modern Storefront**: Fast, responsive UI with zero heavy frameworks.
- **Custom Prints**: Users can upload their own images for custom poster orders.
- **Admin Dashboard**: Secure panel for verifying payments (UTR/Transaction IDs) and managing inventory.
- **MySQL Persistence**: Reliable record-keeping for orders, items, and audit logs.
- **Performance Optimized**: Built-in image compression for lightning-fast gallery loading.

---

## 🛠️ Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Custom Properties), JavaScript (ES6+).
- **Backend**: Node.js, Express.
- **Database**: MySQL 8.0+.
- **Image Processing**: Sharp (for on-the-fly and batch compression).

---

## 💻 Local Setup & Development

Follow these steps to get the project running on your local machine.

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MySQL Server](https://dev.mysql.com/downloads/installer/)

### 2. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/posterhaus.git
cd posterhaus
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Configuration
Create a file named `.env` in the root directory and add your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=posterhaus
```
*Note: The application will automatically create the `posterhaus` database and all required tables upon first run.*

### 5. Setup Assets
- Place your poster images in the `/posters` directory.
- Place your payment QR code at `public/qr.png`.

### 6. Run the Server
```bash
npm start
```
The app will be available at:
- **Storefront**: `http://localhost:3000`
- **Admin Panel**: `http://localhost:3000/admin.html`

---

## 📂 Project Structure
- `/public`: Static assets, HTML storefront, and admin interface.
- `/posters`: Standard poster image assets.
- `/P_wanted`: Temporary storage for user-uploaded custom prints.
- `server.js`: Express server and API routes.
- `db.js`: MySQL connection logic and data migration scripts.
- `compress-posters.js`: Utility script to optimize image assets.

---

## 🔧 Maintenance Commands

### Compress Images
To optimize all images in the `posters` folder for web use (800px width, 70% quality):
```bash
node compress-posters.js
```

---

## 🛡️ Security
- **Authentication**: Admin credentials are hardcoded in `server.js` for this prototype. Update the `USERS` object before deploying.
- **Environment Variables**: Never commit your `.env` file to version control. It is ignored by default via `.gitignore`.

## 📄 License
This project is open-source and available under the [ISC License](LICENSE).
