# Tài liệu: Cơ chế Rate Limiter (Bộ giới hạn tần suất)

Hệ thống **Smart AI Study Companion** tích hợp một bộ giới hạn tần suất phân tán (Distributed Rate Limiter) sử dụng thuật toán **Token Bucket** (Thùng chứa thẻ) được lưu trữ trên **Redis** và điều phối bằng mã **Lua Script**.

## Sơ đồ tổng quan (High-Level Overview)

```mermaid
graph TD
    %% Styling
    classDef worker fill:#f96,stroke:#333,stroke-width:2px;
    classDef redis fill:#bfb,stroke:#333,stroke-width:2px;
    classDef api fill:#bbf,stroke:#333,stroke-width:2px;
    
    W1["Celery Worker A"]:::worker
    W2["Celery Worker B"]:::worker
    RedisLimiter[("Redis Rate Limiter<br/>(Token Bucket)")]:::redis
    GroqAPI["Groq Translation API"]:::api

    W1 -->|1. Yêu cầu Token| RedisLimiter
    W2 -->|1. Yêu cầu Token| RedisLimiter
    
    RedisLimiter -->|Đủ Token: Cho phép| W1
    RedisLimiter -.->|Hết Token: Từ chối| W2
    
    W1 -->|2. Gọi API dịch| GroqAPI
    Note over W2: Thử lại sau 5 giây<br/>(Đẩy lại vào Celery Queue)
```

---

## 1. Tại sao cần Rate Limiter phân tán?

Khi ứng dụng mở rộng quy mô chạy nhiều Celery workers song song:
1. **Tránh bị khóa API**: API dịch thuật (ví dụ Groq) giới hạn nghiêm ngặt số lượng yêu cầu mỗi phút (RPM) và số lượng từ/ký tự mỗi phút (TPM).
2. **Tránh tình trạng race condition**: Nếu sử dụng biến đếm trong Python thông thường, các tiến trình worker chạy song song sẽ không đồng bộ được trạng thái, dẫn tới việc tính toán sai lệch tần suất thực tế.
3. **Quản lý tập trung**: Sử dụng Redis làm bộ lưu trữ trạng thái tập trung giúp đồng bộ hóa giới hạn trên toàn bộ các workers ở các server khác nhau.

---

## 2. Thuật toán Token Bucket (Thùng chứa thẻ)

Bộ giới hạn hoạt động dựa trên mô hình **Token Bucket**:
* Thùng chứa có một **dung lượng tối đa** (`capacity`).
* Các thẻ (tokens) được tự động thêm vào thùng với tốc độ không đổi gọi là **tốc độ nạp** (`fill_rate` - số token/giây).
* Mỗi khi worker chuẩn bị gọi API (ví dụ Groq), nó sẽ yêu cầu tiêu thụ 1 token (`tokens_requested = 1`):
  * Nếu thùng có đủ token: Yêu cầu được chấp nhận, trừ token đi và thực hiện gọi API.
  * Nếu thùng không đủ token: Yêu cầu bị chặn (Rate Limited), worker sẽ hoãn và thử lại sau.

---

## 3. Cơ chế hoạt động của Lua Script (Atomic Operations)

Để đảm bảo tính toàn vẹn dữ liệu và tránh xung đột (race condition), logic kiểm tra và trừ token được viết dưới dạng mã **Lua Script** chạy trực tiếp trong Redis. Redis đảm bảo thực thi các script này một cách **đơn luồng và nguyên tử (atomic)**.

### Mã Lua Script sử dụng ([app/core/rate_limiter.py](file:///D:/FPT/SU26/CODE_INSPIRATION/app/core/rate_limiter.py)):
```lua
local key = KEYS[1]
local requested = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local fill_rate = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

-- Lấy trạng thái hiện tại của bucket từ Redis Hash
local state = redis.call('HMGET', key, 'last_updated', 'tokens')
local last_updated = tonumber(state[1]) or now
local tokens = tonumber(state[2]) or capacity

-- Tự động nạp thêm token dựa trên thời gian trôi qua kể từ lần cập nhật cuối
local elapsed = math.max(0, now - last_updated)
tokens = math.min(capacity, tokens + (elapsed * fill_rate))

-- Kiểm tra xem số lượng token hiện tại có đủ để đáp ứng yêu cầu không
if tokens >= requested then
    tokens = tokens - requested
    -- Lưu lại trạng thái mới
    redis.call('HMSET', key, 'last_updated', now, 'tokens', tokens)
    return 1 -- Chấp nhận yêu cầu (Allowed)
else
    return 0 -- Bị giới hạn tần suất (Rate limited)
end
```

---

## 4. Tích hợp trong Celery Workers

Trong file [app/tasks/transcription_tasks.py](file:///D:/FPT/SU26/CODE_INSPIRATION/app/tasks/transcription_tasks.py), mỗi khi tác vụ [translate_batch_task](file:///D:/FPT/SU26/CODE_INSPIRATION/app/tasks/transcription_tasks.py#L40) chạy:

1. **Khởi tạo Rate Limiter**:
   ```python
   rate_limiter = RedisTokenBucketRateLimiter(
       redis_url=redis_url,
       capacity=30,  # Dung lượng tối đa là 30 request
       fill_rate=0.5 # Nạp lại 0.5 request mỗi giây (tương đương 30 requests/phút)
   )
   ```
2. **Yêu cầu token**:
   ```python
   if not rate_limiter.acquire("groq", tokens_requested=1):
       logger.info("Groq API rate limit reached in Redis. Retrying translation task...")
       raise self.retry(countdown=5)
   ```
    * Nếu Redis trả về `False` (hết token), task sẽ gọi `self.retry(countdown=5)` để đẩy ngược task lại vào hàng đợi Celery và thử lại sau 5 giây.

---

## 5. Cơ chế dự phòng lỗi (Fail-Open Fallback)

Để tránh trường hợp Redis bị sập làm gián đoạn toàn bộ hệ thống dịch thuật:
* Bộ giới hạn tần suất được thiết kế theo cơ chế **Fail-Open** (Mở mặc định khi lỗi).
* Nếu xảy ra lỗi kết nối Redis hoặc không đăng ký được Lua Script, hàm `acquire` sẽ bắt ngoại lệ (`Exception`), ghi nhận cảnh báo và trả về `True`.
* **Ưu điểm**: Tiến trình dịch thuật vẫn tiếp tục chạy bình thường thay vì bị tắc nghẽn hoàn toàn.
* **Nhược điểm**: Có thể dẫn đến lỗi vượt mức giới hạn thực tế từ nhà cung cấp API bên thứ ba (ví dụ: HTTP 429 từ Groq), lúc này worker sẽ dựa vào cơ chế retry của chính task đó để tự hồi phục.
