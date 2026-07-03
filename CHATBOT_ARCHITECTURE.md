# 🧩 Sơ đồ kiến trúc Chatbot AI Tutor (RAG Pipeline) - StudyMind

Tài liệu này mô tả sơ đồ kiến trúc luồng dữ liệu chi tiết của tính năng Chatbot AI Tutor (Gia sư học tập AI) trong dự án StudyMind. Sơ đồ mô tả luồng đi từ Frontend, Backend, Supabase Auth/DB đến Gemini API Key Rotation.

---

## 📊 Sơ đồ Mermaid:

```mermaid
graph TD
    subgraph Frontend [User Client / Frontend]
        UI["1. Chatbot UI (RAG Chatbot Panel)"]
        ClickTS["10. Click Timestamp Badge [MM:SS]"]
        Video["11. Video Player (Tua nhanh đến giây cụ thể)"]
    end

    subgraph Server [FastAPI Web Server / Backend]
        Router["2. API Router (POST /api/chat)"]
        Auth["3. Auth Helper (Verify JWT Token)"]
        Service["5. Chat Service (RAG Context Assembly)"]
    end

    subgraph DB [External Services & Database]
        SupaAuth["4. Supabase Auth (Xác thực người dùng)"]
        SupaDB["6. Supabase Database (Bảng chat_messages)"]
    end

    subgraph LLM [AI Generation & Key Rotation]
        Rotation["7. Key Rotation (Xoay vòng khóa API)"]
        Gemini["8. Gemini API (Sinh câu trả lời thông minh)"]
    end

    %% Luồng Dữ Liệu
    UI -- "Gửi Query + Session_ID + Video Segments" --> Router
    Router --> Auth
    Auth -- "Kiểm tra quyền truy cập" --> SupaAuth
    Router --> Service
    Service -- "Đọc lịch sử trò chuyện cũ" --> SupaDB
    Service -- "Nạp ngữ cảnh RAG (Prompt + Segments + History)" --> Rotation
    Rotation -- "Lấy API Key hoạt động" --> Gemini
    Gemini -- "Trả về văn bản Markdown kèm [MM:SS]" --> Service
    Service -- "Ghi nhận hội thoại mới (Lưu Q&A)" --> SupaDB
    Service -- "Trả về ChatResponse" --> UI
    ClickTS --> Video

    %% Định dạng màu sắc đồng bộ
    style UI fill:#FFD2FC,stroke:#C21580,stroke-width:2px
    style Router fill:#D0E1FD,stroke:#2B579A,stroke-width:2px
    style Service fill:#D0E1FD,stroke:#2B579A,stroke-width:2px
    style SupaDB fill:#E2FCD0,stroke:#3E7A1C,stroke-width:2px
    style Gemini fill:#FDE0D0,stroke:#B25900,stroke-width:2px
    style Video fill:#FFF2CC,stroke:#D6B656,stroke-width:2px
```

---

## 📝 Giải thích luồng dữ liệu (11 Bước):

1.  **Gửi yêu cầu từ Client (Frontend):** Người dùng gõ câu hỏi vào chatbot. Hệ thống đóng gói câu hỏi (`query`), mã phòng chat (`session_id`) và phụ đề bài giảng (`segments`) gửi lên Backend.
2.  **Định tuyến API (Backend):** Endpoint `POST /api/chat` tiếp nhận yêu cầu.
3.  **Xác thực người dùng (Auth):** Bộ phận Auth Helper trích xuất mã token JWT của người dùng từ HTTP Headers.
4.  **Supabase Auth đối chiếu:** Liên lạc với Supabase Auth để đảm bảo người dùng đã đăng nhập hợp lệ.
5.  **Dịch vụ Chatbot (Chat Service):** File `app/services/chat.py` tiếp quản luồng xử lý.
6.  **Truy xuất lịch sử (RAG Database Query):** Đọc các tin nhắn hỏi đáp trước đó từ bảng `chat_messages` trên Supabase Database để AI có "trí nhớ ngắn hạn" về cuộc trò chuyện.
7.  **Lắp ghép Prompt & Xoay vòng Key:** Lắp ghép lịch sử chat + câu hỏi mới + phụ đề video thành 1 Prompt hoàn chỉnh. Gọi module `key_rotation.py` để lấy một API Key Gemini còn hạn ngạch sử dụng.
8.  **Gọi mô hình AI (Gemini Flash/Pro):** Gemini tiếp nhận prompt RAG và sinh câu trả lời tiếng Việt, tự động đính kèm các mốc thời gian dạng `[MM:SS]` dựa theo phụ đề.
9.  **Lưu trữ dữ liệu học tập:** Sau khi nhận phản hồi từ AI, Chat Service lập tức lưu cặp câu hỏi-trả lời mới vào bảng `chat_messages` trên database để phục vụ cho các lần hỏi sau.
10. **Hiển thị & Tương tác (Frontend):** Trình duyệt nhận phản hồi, hiển thị câu trả lời dạng Markdown. Các thẻ `[MM:SS]` được tô xanh nổi bật và biến thành nút bấm.
11. **Tua Video:** Khi người học click vào nút timestamp, hệ thống phát tín hiệu tua trực tiếp video YouTube đến đúng phân cảnh đó để người học xem lại giảng viên nói gì.
