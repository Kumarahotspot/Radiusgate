# Auth Testing Playbook

Stack: FastAPI + MongoDB + React. Auth = JWT bearer token (7 hari), disimpan di localStorage frontend, dikirim via header `Authorization: Bearer <token>`. bcrypt untuk hashing.

## Kredensial
Lihat /app/memory/test_credentials.md (owner, admin sekolah demo, guru demo).

## API
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)
curl -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"susyanto@gmail.com","password":"Owner123!"}'
curl $API/api/auth/me -H "Authorization: Bearer <token>"
```

## MongoDB verification
```
mongosh
use test_database
db.users.find({email:"susyanto@gmail.com"},{password_hash:1})  # hash mulai $2b$
```
Index: users.email (unique), attendance.client_uuid (unique sparse), invoices (school_id+period unique).

## Seed
Owner di-seed dari env OWNER_EMAIL/OWNER_PASSWORD (idempotent: update hash jika password berubah). Sekolah demo "SMA Nusantara (Demo)" + admin + guru + 120 siswa di-seed sekali (guard: kiosk_token KIOSK-DEMO-1).
