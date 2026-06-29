# Hướng dẫn Deploy dự án bằng Dokploy & Cloudflare

Tài liệu này hướng dẫn chi tiết các bước chuẩn bị server, cấu hình Cloudflare và deploy dự án **Smart AI Study Companion** bằng **Dokploy** thông qua file `docker-compose.prod.yml`.

---

## 1. Chuẩn bị Server (VPS)
Bạn cần mua 1 VPS (khuyên dùng tối thiểu **2GB RAM / 2 vCPU**, tốt nhất là **4GB RAM**).

### Bước 1: Cập nhật hệ thống
Sau khi SSH vào server, chạy lệnh cập nhật:
```bash
sudo apt update && sudo apt upgrade -y
```

### Bước 2: Cài đặt Docker & Docker Compose
Dokploy chạy hoàn toàn trên Docker, hãy cài đặt bằng lệnh chính thức:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Bước 3: Cài đặt Dokploy
Chạy lệnh một dòng dưới đây để cài đặt Dokploy lên VPS của bạn:
```bash
curl -sSL https://dokploy.com/install.sh | sh
```
*Sau khi chạy xong, hãy truy cập vào IP của VPS qua cổng **3000** (ví dụ: `http://123.45.67.89:3000`) để tạo tài khoản Admin cho Dokploy.*

---

## 2. Cấu hình Cloudflare
Để gắn domain của bạn vào ứng dụng và bật SSL bảo mật:

1. **Thêm Bản Ghi DNS:**
   * Vào Cloudflare -> DNS -> Records.
   * Thêm bản ghi **A** hoặc **CNAME** trỏ về IP của VPS (ví dụ: `study.yourdomain.com` trỏ về IP VPS).
   * Bật **Proxy status** (Đám mây màu cam) để ẩn IP VPS và tăng tính bảo mật.

2. **Cấu hình SSL/TLS:**
   * Vào mục **SSL/TLS** trên Cloudflare.
   * Chọn chế độ mã hóa là **Full** hoặc **Full (strict)**.
   * *Chú ý:* Tránh chọn chế độ *Flexible* vì có thể gây ra lỗi vòng lặp chuyển hướng vô tận (redirect loop).

---

## 3. Cấu hình & Deploy trên Dokploy

### Bước 1: Kết nối Github với Dokploy
1. Trong giao diện Dokploy, vào mục **Settings** -> **Git Providers**.
2. Chọn **Github** và kết nối tài khoản hoặc cấu hình Github App/Personal Access Token để Dokploy có quyền đọc Repo của bạn.

### Bước 2: Tạo Project và Service Compose
1. Vào **Projects** -> Tạo một Project mới (Ví dụ: `Study Companion`).
2. Chọn **Create Service** -> Chọn **Compose** (vì dự án của chúng ta chạy đa dịch vụ bao gồm FastAPI, Redis, Celery và Frontend).
3. Cấu hình Service:
   * **Repository:** Chọn repo `Smart-AI-Study-Companion`.
   * **Branch:** `main`.
   * **Compose Path:** Nhập `docker-compose.prod.yml` (đây là file cấu hình tối ưu cho production đã được chuẩn bị).

### Bước 3: Thêm Environment Variables (Biến Môi Trường)
Trong trang quản lý của Compose Service trên Dokploy, chuyển qua tab **Environment** và thêm các biến môi trường sau:

#### Biến môi trường cho Backend & Celery:
* `GEMINI_API_KEY`: API Key của Gemini.
* `GROQ_API_KEY`: API Key của Groq.
* `SUPABASE_URL`: URL của Supabase.
* `ANON_KEY`: Anon Key của Supabase.
* `SUPABASE_JWT`: JWT Secret của Supabase.

#### Biến môi trường cho Frontend (Vite nhận lúc build):
* `VITE_SUPABASE_URL`: (Giống URL Supabase ở trên).
* `VITE_SUPABASE_ANON_KEY`: (Giống Anon Key ở trên).

### Bước 4: Cấu hình Domain & Port Routing
1. Trong Compose Service, click vào tab **Domains**.
2. Chọn dịch vụ cần trỏ domain là **frontend** (port `80`). Các dịch vụ khác (`web`, `redis`, `worker`) chạy nội bộ không cần trỏ domain ra ngoài để đảm bảo bảo mật.
3. Nhập domain đã trỏ ở Cloudflare (ví dụ: `study.yourdomain.com`).
4. Bật SSL (Nếu dùng Cloudflare Proxy có thể chọn để Let's Encrypt hoặc Cloudflare tự handle SSL).

### Bước 5: Deploy & Cấu hình Webhook
1. Nhấn nút **Deploy** trong Dokploy. Quá trình build và chạy container sẽ tự động diễn ra. Bạn có thể xem log build trực tiếp.
2. Để tự động redeploy mỗi khi push code lên nhánh `main`, hãy copy link **Webhook** được cấp trong tab *General* của Dokploy và dán vào phần **Webhooks** trong Settings của Repo Github.

---

## 4. Kiểm tra Sau Deploy
* Truy cập `https://study.yourdomain.com` xem giao diện frontend hoạt động chưa.
* Thử tính năng extract transcript / dịch thuật để đảm bảo Celery Worker + Redis kết nối và hoạt động bình thường.
* Xem log của từng container (`web`, `worker`, `frontend`, `redis`) trong mục **Logs** của Dokploy để debug nếu có lỗi xảy ra.
