# Tài liệu: Cơ chế Xoay vòng API Key (API Key Rotation)

Hệ thống **Smart AI Study Companion** hỗ trợ tích hợp và xoay vòng nhiều API keys khác nhau của các dịch vụ bên thứ ba (như Google Gemini và Groq). Cơ chế này giúp phân bổ tải đều giữa các API keys và tự động khôi phục (retry) bằng key dự phòng khi một key gặp lỗi giới hạn hạn mức (Quota Limit hoặc Rate Limit - HTTP 429).

---

## 1. Sơ đồ hoạt động tổng quan (High-Level Overview)

Dưới đây là sơ đồ mô tả cách dịch vụ lấy danh sách keys, trộn ngẫu nhiên (shuffle) để phân tải, và thử lại bằng các keys khác khi xảy ra lỗi.

```mermaid
graph TD
    %% Styling
    classDef client fill:#f9f,stroke:#333,stroke-width:2px;
    classDef service fill:#bbf,stroke:#333,stroke-width:2px;
    classDef key_manager fill:#bfb,stroke:#333,stroke-width:2px;
    classDef api fill:#ddd,stroke:#333,stroke-width:1px;

    %% Nodes
    Client["Client Người dùng"]:::client
    Service["Chat / Translation Service"]:::service
    KeyRotation["Bộ Xoay vòng Key<br/>(key_rotation.py)"]:::key_manager
    API["External API (Gemini/Groq)"]:::api

    %% Flows
    Client -->|1. Gửi yêu cầu| Service
    Service -->|2. Lấy danh sách API Keys| KeyRotation
    KeyRotation -->|3. Đọc Env & Trộn ngẫu nhiên (Shuffle)| KeyRotation
    KeyRotation -->>|4. Trả về danh sách Keys đã trộn| Service
    
    subgraph Vòng lặp xoay vòng Key (Key Rotation Loop)
        Service -->|5a. Gọi API bằng Key thứ [i]| API
        API --x|5b. Lỗi Quota / Rate Limit (HTTP 429)| Service
        Note over Service: Tự động chuyển sang Key [i+1]
        Service -->|6a. Thử lại bằng Key tiếp theo| API
        API -->>|6b. Thành công (200 OK)| Service
    end

    Service -->>|7. Trả kết quả| Client
```

---

## 2. Cách thức cấu hình

Hệ thống cho phép cấu hình một hoặc nhiều API keys dưới dạng chuỗi ngăn cách bằng dấu phẩy (comma-separated value) trong file `.env`:

### Cấu hình cho Gemini:
* `GEMINI_API_KEY`: API key đơn lẻ (dự phòng).
* `GEMINI_API_KEYS`: Danh sách nhiều API keys cách nhau bằng dấu phẩy.
  ```env
  GEMINI_API_KEYS="key_gemini_1,key_gemini_2,key_gemini_3"
  ```

### Cấu hình cho Groq:
* `GROQ_API_KEY`: API key đơn lẻ (dự phòng).
* `GROQ_API_KEYS`: Danh sách nhiều API keys cách nhau bằng dấu phẩy.
  ```env
  GROQ_API_KEYS="key_groq_1,key_groq_2,key_groq_3"
  ```

---

## 3. Logic xử lý chi tiết

Cơ chế xoay vòng được định nghĩa tại [app/core/key_rotation.py](file:///D:/FPT/SU26/CODE_INSPIRATION/app/core/key_rotation.py):

1. **Không duy trì trạng thái (Stateless)**:
   * Tránh việc dùng các bộ đếm tuần tự (Round-Robin) phức tạp cần đồng bộ Redis.
   * Danh sách keys được lấy ra và đảo ngẫu nhiên bằng `random.shuffle()` trong mỗi request. Điều này giúp tải được phân bố đều một cách tự nhiên giữa các keys theo lý thuyết xác suất.
2. **Khả năng chịu lỗi cao (Fault Tolerance)**:
   * Khi gọi API bất đồng bộ (ví dụ: `client.aio.models.generate_content`), hệ thống sẽ duyệt qua từng key trong danh sách đã trộn.
   * Nếu key hiện tại gặp lỗi kết nối hoặc vượt quá giới hạn API, hệ thống sẽ ghi nhận log lỗi (`logger.warning`), bỏ qua và thử tiếp với key tiếp theo mà không làm gián đoạn yêu cầu của người dùng.
