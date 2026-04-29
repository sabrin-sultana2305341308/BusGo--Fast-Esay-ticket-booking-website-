<div align="center">

# 🚌 BusGo

### Fast & Easy Bus Ticket Booking

**A full-stack bus ticket booking web application built for Bangladesh**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PHP](https://img.shields.io/badge/PHP-8.0+-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-ff69b4?style=for-the-badge)](https://busgo.free.nf)
[![License](https://img.shields.io/badge/License-All_Rights_Reserved-red?style=for-the-badge)](LICENSE)

</div>

---

## 📸 Preview

> BusGo offers a clean, mobile-friendly interface for booking bus tickets across major Bangladesh routes — with real-time seat selection, e-ticket PDF downloads, and account management.

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started (Local)](#-getting-started-local)
- [Deployment](#-deployment)
- [API Reference](#-api-reference)
- [Routes & Pricing](#-routes--pricing)
- [Cancellation Policy](#-cancellation-policy)
- [Usage](#-usage)
- [Author](#-author)

---

## 📖 About

**BusGo** is a full-stack bus ticket booking platform designed for Bangladesh. Users can create an account, browse available routes, pick seats on an interactive seat map, book tickets, download PDF boarding passes, and manage or cancel their bookings — all within a smooth single-page experience.

The project was built and designed by **SubTech Limited** as a complete real-world web application, covering both frontend UI and a PHP/MySQL backend with session-based authentication.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 User Authentication | Register & login with email or phone number |
| 🗺️ Route Selection | 5 major Bangladesh routes with dynamic pricing |
| 💺 Interactive Seat Map | 40-seat bus map with live availability from the database |
| ⏱️ Seat Hold Timer | 2-minute countdown to reserve selected seats |
| 🎟️ E-Ticket PDF | Downloadable boarding-pass style PDF generated client-side |
| 📋 My Tickets | View all past and upcoming bookings |
| ❌ Smart Cancellation | Cancel tickets with automatic refund calculation |
| 📱 Fully Responsive | Optimised for mobile, tablet, and desktop |
| 🔒 Secure Backend | bcrypt passwords, PHP sessions, server-side validation |
| ⚡ Real-time Seats | Seat availability fetched live per route/date/time |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | PHP 8.0+ |
| **Database** | MySQL 5.7+ / MariaDB 10.3+ |
| **PDF Generation** | jsPDF (client-side) |
| **Icons** | Font Awesome 6 |
| **Fonts** | Google Fonts — Poppins |
| **Local Dev** | XAMPP (Apache + MySQL + PHP) |
| **Hosting** | InfinityFree |

---

## 📁 Project Structure

BusGo/
├── BusGo3_0.html          # Main single-page frontend
├── Style3.css             # All styles & responsive design
├── script3.js             # Frontend logic, seat map, API calls
├── config.example.php     # Database config template (safe to share)
├── db_infinityfree.sql    # MySQL schema — import this into your DB
├── .htaccess              # Apache security & CORS rules
├── .gitignore             # Excludes config.php (contains passwords)
├── README.md              # This file
└── api/
├── auth.php           # Login / Register / Logout / Session check
└── bookings.php       # List / Create / Cancel / Booked seats

> ⚠️ `config.php` is excluded from this repository via `.gitignore` because it contains database credentials. Use `config.example.php` as a template.

---

## 🚀 Getting Started (Local)

### Prerequisites
- [XAMPP](https://www.apachefriends.org/) — includes PHP, MySQL, Apache

### Steps

**1. Clone the repository**
```bash

```

**2. Move to XAMPP web root**
Windows: C:\xampp\htdocs\BusGo
Mac:     /Applications/XAMPP/htdocs/BusGo/

**3. Start XAMPP**
- Open XAMPP Control Panel
- Click **Start** on **Apache** and **MySQL**

**4. Set up the database**
- Go to `http://localhost/phpmyadmin`
- Click **New** → name it `busgo_db` → click **Create**
- Select `busgo_db` → click **Import** → choose `db_infinityfree.sql` → click **Go**

**5. Create your config file**
```bash
# Copy the example file
cp config.example.php config.php
```
Then open `config.php` and fill in:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'busgo_db');
define('DB_USER', 'root');
define('DB_PASS', '');   // XAMPP default — leave empty
```

**6. Open in browser**
http://localhost/BusGo/BusGo3_0.html

---

## 🌐 Deployment

### PHP Shared Hosting (Recommended — e.g. InfinityFree)

1. Upload all files to your host's `htdocs` folder
2. In phpMyAdmin, select your existing database and import `db_infinityfree.sql`
3. Create `config.php` from the `config.example.php` template with your host's DB credentials
4. Visit your domain — the site will be live

> 🔗 Live at: **https://busgo.free.nf**

---

## 📡 API Reference

All endpoints return JSON: `{ "success": true, ... }` or `{ "success": false, "message": "..." }`

### Auth — `api/auth.php`

| Method | `?action=` | Body | Description |
|--------|-----------|------|-------------|
| GET | `check` | — | Returns current logged-in user |
| POST | `login` | `identifier`, `password` | Login with email or phone |
| POST | `register` | `name`, `phone`, `email`, `password` | Create new account |
| POST | `logout` | — | Destroy session |

### Bookings — `api/bookings.php`

| Method | `?action=` | Params | Description |
|--------|-----------|--------|-------------|
| GET | `list` | — | All bookings for logged-in user |
| GET | `booked_seats` | `route`, `date`, `time` | Occupied seat numbers |
| POST | `create` | `route`, `routeLabel`, `ticketType`, `date`, `time`, `seats`, `count`, `total` | Create a booking |
| POST | `cancel` | `bookingId` | Cancel booking & return refund details |

---

## 🗺️ Routes & Pricing

| Route | One Way | Round Way |
|---|---|---|
| Dhaka → Cumilla | 250 BDT | 500 BDT |
| Dhaka → Chattogram | 650 BDT | 1,300 BDT |
| Dhaka → Sylhet | 700 BDT | 1,400 BDT |
| Dhaka → Rajshahi | 800 BDT | 1,600 BDT |
| Dhaka → Khulna | 650 BDT | 1,300 BDT |

---

## ❌ Cancellation Policy

| When Cancelled | Refund |
|---|---|
| Within 24 hours of booking | ✅ 100% refund |
| More than 24 hours before departure | ✅ 100% refund |
| 12–24 hours before departure | ⚠️ 75% refund |
| 6–12 hours before departure | ⚠️ 50% refund |
| Less than 6 hours before departure | ❌ No refund |

---

## 💡 Usage

1. **Register** — Create an account with your name, Bangladeshi phone number, email and password
2. **Select a Route** — Choose from 5 major routes and pick one way or round way
3. **Choose Date & Time** — Select your travel date and departure time
4. **Pick Seats** — Click seats on the interactive 40-seat bus map (live availability)
5. **Book** — Confirm your booking — a unique reference ID is generated
6. **Download Ticket** — Get a PDF boarding pass with all your trip details
7. **Manage** — View or cancel any booking from the My Tickets section

---

## 👤 Author

<div align="center">

**SubTech Limited**

📧 busgo.subtech@yahoo.com
📍 Dhaka, Bangladesh

*Building smart digital solutions for everyday needs*

---

⭐ If you found this project helpful, please consider giving it a star!

</div>

