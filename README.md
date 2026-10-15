# FitFlow – Gym Management System

## About the Project

FitFlow is a web-based Gym Management System designed to simplify gym operations and improve member management. It provides a centralized platform for managing gym members, membership plans, and related gym activities through a user-friendly interface.

The project uses a modern web development stack and aims to make gym administration more organized and efficient.

## Features

- **User Authentication:** Secure registration and login functionality.
- **Dashboard:** A centralized interface for accessing gym management features.
- **Membership Plans:** View and manage available gym plans.
- **Backend API:** RESTful API built with Node.js and Express.
- **Database Integration:** MongoDB for storing application data.
- **Responsive Interface:** React-based frontend for a user-friendly experience.
- **Containerization:** Docker support for packaging and running the application in containers.
- **Continuous Integration:** GitHub Actions workflow for automating frontend builds and backend tests.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Authentication | JSON Web Tokens (JWT) |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Version Control | Git and GitHub |

## Project Structure

```text
FitFlow-Gym-Management/
├── client/                 # React frontend
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── server/                 # Express backend
│   ├── src/
│   └── Dockerfile
├── .github/
│   └── workflows/
│       └── ci.yml          # CI pipeline
├── docker-compose.yml      # Multi-container configuration
├── .dockerignore           # Excludes unnecessary build files
└── README.md
```

## Prerequisites

To run the application locally, you may need:

- Node.js and npm
- MongoDB or a MongoDB connection string
- Git

To run the application using Docker, you need access to a Docker-compatible environment with Docker Compose support. Docker Desktop is one option, but a suitable cloud environment can also be used.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Sharavani26/FitFlow-Gym-Management.git
cd FitFlow-Gym-Management
```

### 2. Set Up the Backend

```bash
cd server
npm install
```

Configure the required environment variables in your local `.env` file, including the database connection string, port, and authentication secret.

Start the backend using the start command configured in `server/package.json`.

### 3. Set Up the Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed by Vite in the terminal.

## Running with Docker

Ensure the Dockerfiles and `docker-compose.yml` are configured for your project.

Build the images and start the containers:

```bash
docker compose up --build -d
```

Check running containers:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs
```

Stop the containers:

```bash
docker compose down
```

The commands must be run in an environment where Docker and Docker Compose are available.

## Continuous Integration

FitFlow uses GitHub Actions to automate parts of the development workflow.

The CI pipeline is configured to:

1. Install frontend dependencies.
2. Build the React frontend.
3. Install backend dependencies.
4. Run the backend test command.

The workflow runs on pushes and pull requests targeting the `main` branch. Successful execution depends on valid project scripts, lockfiles, and passing tests.

## Environment Variables

Store sensitive configuration in local environment files. Typical settings may include:

- Backend port
- MongoDB connection string
- JWT secret
- Frontend API URL
- Allowed frontend origin

**Security:** Never commit `.env` files, passwords, database credentials, or private API keys to GitHub.

## Future Enhancements

- Member attendance tracking
- Trainer and staff management
- Membership renewal notifications
- Payment tracking
- Reports and analytics
- Improved role-based access control

## Conclusion

FitFlow aims to provide a convenient and maintainable solution for gym administration. By combining a React frontend, an Express backend, MongoDB, Docker, and automated CI checks, the project supports organized development and deployment.

## Author

Developed as an academic project.

## Repository

[FitFlow Gym Management System on GitHub](https://github.com/Sharavani26/FitFlow-Gym-Management.git)
