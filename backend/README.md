# Pincode backend (FastAPI)

## Первый запуск

```bash
brew install postgresql@16
brew services start postgresql@16
createdb pincode_dev
psql -d pincode_dev -c "CREATE ROLE pincode_app LOGIN PASSWORD 'pincode_dev_password'; GRANT ALL PRIVILEGES ON DATABASE pincode_dev TO pincode_app; GRANT ALL ON SCHEMA public TO pincode_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pincode_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pincode_app;"

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # уже есть готовый .env для локальной разработки

alembic upgrade head
```

## Запуск сервера

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Модель мультитенантности

Изоляция данных по `company_id` реализована на двух уровнях:
- в коде — явный `WHERE company_id = ...` в каждом запросе;
- в БД — Row-Level Security политики на `projects`, `pins`, `photos`.
  Приложение подключается НЕ суперпользователем (роль `pincode_app`),
  иначе RLS будет проигнорирован. На каждый запрос перед чтением/записью
  выполняется `SET LOCAL app.current_company_id = '<uuid>'` — см. `app/deps.py`.

## Новая миграция

```bash
alembic revision --autogenerate -m "описание"
alembic upgrade head
```
