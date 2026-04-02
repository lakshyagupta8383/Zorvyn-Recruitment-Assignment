# Finance Data Processing Backend

## Overview

This project is a backend system for a finance dashboard that manages users, financial records, and analytics with role-based access control.

The system is designed with a focus on clean architecture, maintainability, and logical data flow.

---

## Tech Stack

* Node.js
* Express.js
* PostgreSQL
* JWT Authentication
* Zod (validation)

---

## Architecture

Layered modular architecture:

Routes → Controllers → Services → Database

Modules:

* Auth
* Users
* Records
* Categories
* Dashboard

### High-Level Design
![High-Level Design](./docs/hld.png)

### Entity Relationship Diagram
![ERD](./docs/erd.png)

---

## Features

### Authentication

* User registration (default role: Viewer)
* JWT-based login
* Logout with token invalidation
* Current user endpoint

---

### User Management (Admin)

* Create, update, delete users
* Assign roles
* Activate / deactivate users
* Pagination support

---

### Financial Records

* Create, update, delete (soft delete)
* Filtering:

  * type
  * category
  * date range
* Pagination support
* Search functionality

---

### Categories

* System-defined and user-defined categories
* CRUD operations (admin)

---

### Dashboard APIs

#### Basic (Viewer)

* Total income
* Total expenses
* Net balance

#### Advanced (Analyst+)

* Category-wise breakdown
* Monthly and weekly trends
* Recent activity
* Top spending categories

---

## Role-Based Access Control

| Capability | Viewer | Analyst | Admin |
| --- | --- | --- | --- |
| Register / login / logout | Yes | Yes | Yes |
| View own profile (`/auth/me`) | Yes | Yes | Yes |
| Create records | Yes | Yes | Yes |
| Read own records | Yes | Yes | Yes |
| Read all records | No | Yes | Yes |
| Search records | No | Yes | Yes |
| Update own records | Yes | Yes | Yes |
| Delete own records | Yes | Yes | Yes |
| Update any record | No | No | Yes |
| Delete any record | No | No | Yes |
| Access `/users` module | No | No | Yes |
| Assign or change roles | No | No | Yes |
| Activate / deactivate users | No | No | Yes |
| View dashboard basic summary | Yes | Yes | Yes |
| View advanced analytics | No | Yes | Yes |

Inactive users are restricted from accessing the system.

---

## Default Access Behavior

* New users registered via `/api/auth/register` are assigned the **Viewer** role by default.

### Test Credentials

**Admin**

* email: [admin@zorvyn.com](mailto:admin@zorvyn.com)
* password: admin123

**Analyst**

* email: [analyst@zorvyn.com](mailto:analyst@zorvyn.com)
* password: analyst123

---

## API Examples

* POST /api/auth/login
* GET /api/records?type=expense&page=1&limit=10
* GET /api/records/search?q=rent
* GET /api/dashboard/summary

---

## Validation & Error Handling

* Request validation using Zod
* Centralized error handling
* Standardized error responses

---

## Database Design

Entities:

* Users
* Roles
* Records
* Categories
* Sessions

Key design decisions:

* UUID primary keys
* Normalized roles table
* Soft delete for records
* Indexed fields for performance

---

## Setup Instructions

1. Clone repository

2. Install dependencies:
   npm install

3. Create `.env`:
   DATABASE_URL=your_db_url
   JWT_SECRET=your_secret

4. Run DB setup / seed

5. Start server:
   npm run dev

---

## Assumptions

* JWT used without refresh tokens
* Soft delete used for records
* Categories can be system-defined or user-created

---

## Trade-offs

* Simplified authentication flow
* Monolithic architecture
* Limited session management

---

## Future Improvements

* Refresh tokens
* Rate limiting
* Caching
* Unit and integration tests

---

## Conclusion

This project demonstrates backend system design with strong focus on architecture, access control, and data modeling. It emphasizes clean implementation, maintainability, and practical engineering decisions.
