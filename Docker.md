# Run FitFlow with Docker

Docker Compose runs the React frontend, Node.js API, and MongoDB. Nginx serves the frontend and proxies API and health requests to the API container. MongoDB data is stored in the `mongo-data` named volume.

## Start

1. Install Docker Desktop and make sure its engine is running.
2. From the repository root, copy `.env.example` to `.env`.
3. Replace `JWT_SECRET` and `METRICS_TOKEN` in `.env` with different random secrets, each at least 32 characters long. Keep `.env` private.
4. Build and start the application:

   ```powershell
   docker compose up --build -d
   ```

5. Open <http://localhost:8080>. The API readiness check is available at <http://localhost:8080/health/ready>.

The application is bound to localhost by default. The API and MongoDB ports are not published to the host; browser API requests go through Nginx at the frontend origin.

## Useful commands

```powershell
docker compose ps
docker compose logs -f
docker compose down
```

`docker compose down` preserves MongoDB data. To permanently remove the database volume as well, use `docker compose down --volumes`.

Set `CLIENT_ORIGIN` to the exact browser origin if you change the host or port. To make the frontend reachable from other machines, change the published-address binding in `docker-compose.yml` and configure appropriate network access and HTTPS first.
