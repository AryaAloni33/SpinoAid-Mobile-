# SpinoAid Backend

FastAPI + MongoDB backend with JWT authentication.

## Quick Start

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Server: `http://localhost:8000` | Docs: `http://localhost:8000/docs`

**Requires**: MongoDB running on `localhost:27017`

## Project Structure

```
backend/
├── main.py              # FastAPI app, image upload, DL inference
├── config.py            # MongoDB URI, JWT settings, CORS
├── database.py          # MongoDB connection & collections
├── auth/
│   ├── routes.py        # POST /auth/register, /auth/login, GET /auth/me
│   ├── models.py        # Request/response schemas
│   └── utils.py         # JWT create/verify, password hashing
├── patients/
│   ├── routes.py        # CRUD: /api/patients
│   └── models.py        # Patient schemas
├── annotations/
│   ├── routes.py        # Save/fetch/delete annotations
│   └── models.py        # Annotation schemas
├── models/              # DL model files
└── requirements.txt
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/auth/me` | Yes | Get current user |
| GET | `/api/patients` | Yes | List patients |
| POST | `/api/patients` | Yes | Create patient |
| GET | `/api/patients/{id}` | Yes | Get patient |
| PUT | `/api/patients/{id}` | Yes | Update patient |
| DELETE | `/api/patients/{id}` | Yes | Delete patient |
| POST | `/api/annotations` | Yes | Save annotations |
| GET | `/api/annotations/{patient_id}` | Yes | Get annotations |
| DELETE | `/api/annotations/{id}` | Yes | Delete annotation |
| POST | `/api/upload-image` | No | Upload X-ray image |
| POST | `/api/analyze` | No | Run DL analysis |
