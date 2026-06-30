# StudyMind: Smart AI Study Companion

[🌐 English Version](README_EN.md)

Dự án StudyMind (Smart AI Study Companion) là một ứng dụng học tập thông minh dựa trên công nghệ Trí tuệ Nhân tạo (AI). Hệ thống tự động trích xuất nội dung từ các bài giảng video trên YouTube, dịch thuật sang tiếng Việt song song với việc giữ nguyên các thuật ngữ kỹ thuật chuyên ngành (Machine Learning, Computer Science, Data Science), đồng thời tích hợp các công cụ hỗ trợ học tập đắc lực như Sơ đồ tư duy AI, Flashcards, Trắc nghiệm (Quiz) và RAG Chatbot.

---

## MỤC LỤC
1. [Tính Năng Cốt Lõi](#tính-năng-cốt-lõi)
2. [Kiến Trúc & Quy Trình Xử Lý](#kiến-trúc--quy-trình-xử-lý)
3. [Hướng Dẫn Triển Khai Nhanh với Docker](#hướng-dẫn-triển-khai-nhanh-với-docker)
4. [Hướng Dẫn Cài Đặt Thủ Công (Local Setup)](#hướng-dẫn-cài-đặt-thủ-công-local-setup)
5. [Lược Đồ Cơ Sở Dữ Liệu (Supabase SQL)](#lược-đồ-cơ-sở-dữ-liệu-supabase-sql)
6. [Danh Sách Các Endpoint API Chính](#danh-sách-các-endpoint-api-chính)

---

## TÍNH NĂNG CỐT LÕI

### 1. Trình Học Video Tương Tác (Interactive Workspace)
* **Phụ đề thông minh:** Hỗ trợ phụ đề đơn ngữ tiếng Việt (chứa thuật ngữ kỹ thuật được highlight) hoặc song ngữ Anh - Việt. Hệ thống tự động đồng bộ hóa thời gian phát khớp với video (bao gồm độ trễ offset 400ms để tối ưu hiển thị).
* **Tra cứu thuật ngữ tự động:** Khi người dùng di chuột vào các thuật ngữ chuyên ngành được làm nổi bật (highlights), video sẽ tự động tạm dừng, đồng thời hiển thị hộp thoại định nghĩa thuật ngữ trực quan.
* **Ghi nhớ trạng thái (Persistence):** Hệ thống lưu trữ các lựa chọn của người dùng về việc Bật/Tắt phụ đề phủ (CC overlay) và Bật/Tắt tính năng Cuộn tự động (Auto-Scroll) vào `localStorage`, đảm bảo không bị reset khi tải lại trang.
* **Giới hạn thời lượng:** Hiển thị cảnh báo trực quan và giới hạn bài học đối với các video có thời lượng quá 1 giờ để đảm bảo hiệu năng xử lý.

### 2. Sơ Đồ Tư Duy AI (AI Mindmap)
* **Tổng hợp tự động:** Gemini AI phân tích nội dung transcript của video giảng dạy để xây dựng sơ đồ cây phân cấp hoàn toàn bằng tiếng Việt.
* **Hỗ trợ di động tối đa:** Sơ đồ tự động thu nhỏ về tỷ lệ tối ưu (`55%`) trên thiết bị di động, đồng thời hỗ trợ di chuyển (Pan) qua lại bằng cử chỉ chạm đa điểm (Touch Gestures) trên màn hình điện thoại hoặc kéo thả chuột trên máy tính.
* **Tương tác trực tiếp:** Nhấp chuột vào bất kỳ nút nào trên sơ đồ tư duy để tua video ngay lập tức đến mốc thời gian diễn giải kiến thức đó.

### 3. Bộ Học Tập Flashcards & Trắc Nghiệm (Quiz Kit)
* **Sinh câu hỏi tự động:** Hệ thống tự động trích xuất các khái niệm chính từ bài giảng để tạo ra bộ thẻ ghi nhớ (Flashcards) hai mặt và các câu hỏi trắc nghiệm khách quan chất lượng cao.
* **Khảo sát phản hồi tích hợp:** Sau khi hoàn thành bài thi trắc nghiệm, hệ thống hiển thị bảng điểm, đánh giá năng lực chi tiết kèm đường dẫn khảo sát Google Form để ghi nhận phản hồi từ người dùng.

### 4. Trợ Lý Học Tập RAG Chatbot
* **Hỏi đáp thông thái:** Chatbot sử dụng kỹ thuật RAG (Retrieval-Augmented Generation) để trả lời các câu hỏi dựa trên ngữ cảnh thực tế của toàn bộ nội dung bài học.

### 5. Thiết Kế Tương Thích Di Động (Mobile Responsive Design)
* **Ngăn kéo điều hướng (Hamburger Drawer):** Trên màn hình di động, các chức năng phụ như thay đổi ngôn ngữ, bật tắt giao diện sáng/tối và thông tin tài khoản được xếp gọn vào một menu ngăn kéo trực quan.
* **Nút bấm co giãn:** Toàn bộ form nhập đường link và các nút chức năng được tối ưu hóa hiển thị thành hai dòng, phân chia cột 50-50 cân đối và bo tròn góc mềm mại (`12px`), loại bỏ hiện tượng méo hoặc tràn khung hình.
* **Favicon động:** Icon favicon tự động đảo ngược màu sắc dựa trên chế độ sáng/tối của hệ điều hành.

---

## KIẾN TRÚC & QUY TRÌNH XỬ LÝ

### 1. Quy Trình Trích Xuất & Dịch Phụ Đề (Celery Tasks Pipeline)
Khi người dùng dán đường link YouTube vào hệ thống:
1. **Bước 1 (FastAPI Entry):** API nhận yêu cầu và xếp hàng một tiến trình xử lý nền (Celery task chain), trả về mã `task_id` cho client với trạng thái `202 Accepted`.
2. **Bước 2 (Trích xuất transcript):** Hệ thống tìm kiếm và tải phụ đề gốc qua thư viện `yt-dlp`. Nếu video không có sẵn phụ đề, hệ thống tự động tải file âm thanh và kích hoạt mô hình Gemini Speech-to-Text để nhận dạng giọng nói.
3. **Bước 3 (Chia nhóm dịch thuật):** Transcript được phân tách thành từng đoạn ngắn (segment). Hệ thống gom nhóm 10 đoạn mỗi đợt và phân luồng dịch song song bằng API Groq Llama 3 để tối ưu hóa thời gian phản hồi.
4. **Bước 4 (Gộp & Đánh dấu thuật ngữ):** Các bản dịch được hợp nhất lại, đồng thời đối chiếu với cơ sở dữ liệu thuật ngữ chuyên ngành (Glossary) để làm nổi bật từ khóa trên UI.

### 2. Cơ Chế Giới Hạn Tần Suất API (Rate Limiting)
* Bộ giới hạn tần suất dựa trên thuật toán Token-Bucket sử dụng bộ nhớ chung Redis (`app/core/rate_limiter.py`).
* Bộ giới hạn được chia sẻ chung giữa các tiến trình chạy ngầm Celery và API đồng bộ để tránh bị các nhà cung cấp dịch vụ LLM khóa API do gửi quá nhiều truy vấn liên tục.

### 3. Supabase Auth & JWT Verification
* Backend xác thực quyền truy cập của người dùng bằng cách giải mã Base64 và kiểm tra chữ ký số JWT ES256 được cấp từ Supabase Auth, tăng tính bảo mật cho hệ thống.

---

## HƯỚNG DẪN TRIỂN KHAI NHANH VỚI DOCKER

### 1. Cấu Hình Tệp Tin Môi Trường (.env)
Hãy tạo một file `.env` tại thư mục gốc của dự án với nội dung như sau:
```env
# API Keys của các mô hình LLM
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"

# Cấu hình Supabase (Lấy tại Project Settings -> API)
SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
ANON_KEY="your-supabase-anon-key"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_JWT="your-supabase-jwt-secret"
```

### 2. Khởi Chạy Hệ Thống
Chạy lệnh sau tại thư mục gốc để khởi chạy toàn bộ các dịch vụ (FastAPI Backend, Celery Worker, Redis, và Vite Frontend):

* **Chế độ phát triển (Development):**
  ```bash
  docker compose up --build
  ```
* **Chế độ sản xuất (Production - có DB Connection Check & Giới hạn 2 video):**
  ```bash
  docker compose -f docker-compose.prod.yml up --build -d
  ```

Hệ thống sẽ chạy tại địa chỉ:
* **Frontend:** [http://localhost:5173](http://localhost:5173) (Hoặc chuyển hướng qua API Gateway port 8000)
* **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## HƯỚNG DẪN CÀI ĐẶT THỦ CÔNG (LOCAL SETUP)

Nếu bạn không muốn chạy qua Docker, hãy thực hiện cài đặt trực tiếp trên hệ điều hành vật lý:

### 1. Yêu Cầu Hệ Thống
* Node.js phiên bản 18 trở lên.
* Python phiên bản 3.10 trở lên.
* Redis server (cần hoạt động trên port mặc định `6379`).

### 2. Cài Đặt Tự Động Với Một Lệnh
Chạy lệnh sau tại thư mục gốc của dự án. Script này sẽ tự động cài đặt các gói NPM cho frontend, tạo môi trường ảo Python (`.venv`) và cài đặt các thư viện backend cần thiết:
```bash
npm run setup
```

### 3. Chạy Các Dịch Vụ

* **Chạy chế độ nhẹ nhàng (Frontend & Backend API - không cần Celery/Redis):**
  ```bash
  npm run dev
  ```
* **Chạy đầy đủ hệ thống chạy nền (Yêu cầu Redis Server đang hoạt động):**
  ```bash
  npm run fullstack
  ```

---

## LƯỢC ĐỒ CƠ SỞ DỮ LIỆU (SUPABASE SQL)

Để lưu trữ lịch sử học tập và từ điển kỹ thuật, hãy tạo các bảng sau trong phần **SQL Editor** của Supabase Dashboard:

```sql
-- 1. Bảng quản lý phiên học (chat_sessions)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_video ON public.chat_sessions(user_id, video_url);

-- 2. Bảng lưu lịch sử tin nhắn Chatbot RAG (chat_messages)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_query TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);

-- 3. Bảng tra cứu thuật ngữ chuyên ngành (glossary_definitions)
CREATE TABLE IF NOT EXISTS public.glossary_definitions (
    term TEXT PRIMARY KEY,
    translation TEXT NOT NULL,
    definition TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bật Row Level Security (RLS) bảo mật dữ liệu
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_definitions ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách phân quyền người dùng
CREATE POLICY "Allow users to manage their own sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage messages in their own sessions" ON public.chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow anyone to read glossary definitions" ON public.glossary_definitions
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert glossary definitions" ON public.glossary_definitions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

---

## DANH SÁCH CÁC ENDPOINT API CHÍNH

* **`POST /api/transcriptions`**: Trích xuất transcript từ video YouTube (Tự động tải phụ đề có sẵn hoặc kích hoạt Gemini Speech-to-Text).
* **`POST /api/transcriptions/translate`**: Dịch danh sách các câu sang tiếng Việt (giữ nguyên thuật ngữ chuyên ngành tiếng Anh).
* **`POST /api/transcriptions/async`**: Gửi yêu cầu dịch thuật và trích xuất chạy nền không đồng bộ (trả về `task_id`).
* **`GET /api/tasks/{task_id}`**: Lấy trạng thái và kết quả của tiến trình chạy nền.
* **`POST /api/chat/raw`**: Gửi câu hỏi RAG trực tiếp dựa trên ngữ cảnh các đoạn transcript được truyền vào payload.
* **`GET /api/glossary`**: Lấy danh sách toàn bộ thuật ngữ chuyên ngành được định nghĩa trong database.
