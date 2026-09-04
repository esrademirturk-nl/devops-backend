# DevOps Backend

Basit bir REST API. DevOps projesi kapsamında Ubuntu VPS üzerinde Nginx reverse proxy
arkasında çalışacak ve GitHub Actions ile otomatik deploy edilecek şekilde tasarlanmıştır.

## Amaç ve Teknolojiler

- **Amaç:** Frontend uygulamasına servis veren, sağlık durumu ve versiyon bilgisi dönen basit bir backend.
- **Teknolojiler:** Node.js, Express, dotenv, cors.

## Endpoint'ler

| Method | Path           | Açıklama                                  |
|--------|----------------|--------------------------------------------|
| GET    | `/`            | Uygulamanın çalıştığını gösteren mesaj     |
| GET    | `/api/health`  | Sağlık durumu (`{"status": "UP"}`)         |
| GET    | `/api/info`    | Uygulama adı, versiyon ve ortam bilgisi    |

## Local Ortamda Çalıştırma

```bash
git clone <bu-repo-url>
cd devops-backend
cp .env.example .env   # değerleri kendine göre doldur
npm install
npm run dev             # veya: npm start
```

Uygulama varsayılan olarak `http://127.0.0.1:3000` adresinde ayağa kalkar.

## Environment Variable'lar

`.env.example` dosyasına bakınız. Gerekli değişkenler:

| Değişken       | Açıklama                                   |
|----------------|---------------------------------------------|
| `PORT`         | Uygulamanın dinleyeceği local port (3000)  |
| `NODE_ENV`     | `development` / `production`               |
| `APP_VERSION`  | `/api/info` içinde dönecek versiyon bilgisi |
| `DATABASE_URL` | (varsa) veritabanı bağlantı adresi         |
| `API_KEY`      | (varsa) dış servis API anahtarı            |

`.env` dosyası repository'ye eklenmez (bkz. `.gitignore`). Production değerleri sunucuda
veya GitHub Actions secrets üzerinden yönetilir.

## Domain

Backend, `https://BACKEND_DOMAIN` adresinden HTTPS üzerinden erişilebilir olacak şekilde
Nginx reverse proxy arkasında çalışır. Uygulama yalnızca `127.0.0.1:3000` üzerinde dinler;
dışarıya doğrudan açık değildir.

## Production'a Deploy

Deployment, `main` branch'ine yapılan her push sonrasında GitHub Actions (`.github/workflows/deploy.yml`)
tarafından otomatik olarak gerçekleştirilir:

1. Kod checkout edilir.
2. Bağımlılıklar kurulur (`npm ci`).
3. Testler çalıştırılır.
4. Kod, SSH ile Ubuntu VPS üzerindeki `DEPLOY_PATH` dizinine gönderilir.
5. Sunucuda production bağımlılıkları kurulur (`npm ci --omit=dev`).
6. Uygulama PM2 üzerinden kontrollü şekilde yeniden başlatılır (`pm2 reload`).
7. `/api/health` endpoint'i üzerinden health check yapılır.

Sunucuya manuel bağlanıp `git pull` yapmak deployment yöntemi olarak kullanılmaz; tüm süreç
GitHub Actions üzerinden otomatik yürütülür.

### Gerekli GitHub Actions Secrets

| Secret            | Açıklama                                  |
|-------------------|---------------------------------------------|
| `SERVER_HOST`     | VPS IP adresi                              |
| `SERVER_USER`     | Deployment için kullanılan kısıtlı kullanıcı |
| `SERVER_SSH_KEY`  | SSH private key (deployment kullanıcısına ait) |
| `SERVER_PORT`     | SSH portu                                  |
| `DEPLOY_PATH`     | Sunucuda uygulamanın bulunduğu dizin (`/var/www/backend-app`) |
