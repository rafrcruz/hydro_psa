# Hydro PSA Demonstration

This project is a demonstration application for the client Hydro, simulating an **Automation Request Portal (PSA)** with a service desk experience.

## Features

- **Request Creation:** Users can open new support tickets.
- **Service Queue:** A queue system for managing incoming requests.
- **Status Tracking:** Users can track the status of their requests.
- **Dashboards:** Panels for automation and management views.

## Technical Architecture

This is a **frontend-only** application built with the following stack:

- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **Local Storage:** `Dexie.js` for IndexedDB persistence.

### Data Persistence

The application uses the browser's IndexedDB for local data storage.
- On the first load, if the local database is empty, it's seeded with mock data.
- If data already exists, it's reused, allowing for a high-fidelity prototype experience without a backend.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode.
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### `npm run build`

Builds the app for production to the `dist` folder.

### `npm run lint`

Lints the project files using ESLint.

### `npm run preview`

Serves the production build locally for preview.

## Project Structure

- `src/data/`: Contains the local database schema and seed data.
- `src/services/mockApi.js`: Simulates an asynchronous API layer.
- `src/pages/`: Contains the main pages for different user profiles (requester, executor, automation, management).
- `src/router/`: Handles routing and access control based on user profiles.
- `src/components/`: Reusable UI components.
