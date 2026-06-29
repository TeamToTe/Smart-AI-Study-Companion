-- BẢN THIẾT KẾ DATABASE LƯU LỊCH SỬ CHAT CHO DỰ ÁN STUDYMIND
-- Hãy sao chép toàn bộ đoạn mã này và dán vào phần SQL Editor của Supabase:
-- https://supabase.com/dashboard/project/frstauueztnjamqinnne/sql/new

-- 1. Tạo bảng quản lý phiên chat (chat_sessions)
-- Liên kết khóa ngoại user_id trực tiếp tới auth.users(id) của Supabase Auth
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tạo index để tìm kiếm nhanh theo user và video
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_video ON public.chat_sessions(user_id, video_url);

-- 2. Tạo bảng lưu trữ tin nhắn theo cặp hỏi - đáp (chat_messages)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_query TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tạo index theo session_id để tải lịch sử chat nhanh hơn
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);

-- 3. Cấu hình Row Level Security (RLS) để bảo mật thông tin (Tùy chọn nhưng khuyến khích)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách (Policies) để người dùng chỉ được xem/thêm dữ liệu của chính mình
CREATE POLICY "Allow users to manage their own sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage messages in their own sessions" ON public.chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()
        )
    );

-- 4. Tạo bảng lưu trữ định nghĩa thuật ngữ kỹ thuật (glossary_definitions)
CREATE TABLE IF NOT EXISTS public.glossary_definitions (
    term TEXT PRIMARY KEY,
    translation TEXT NOT NULL,
    definition TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cấu hình Row Level Security (RLS) cho glossary_definitions
ALTER TABLE public.glossary_definitions ENABLE ROW LEVEL SECURITY;

-- Cho phép mọi người dùng đọc (SELECT) định nghĩa thuật ngữ
CREATE POLICY "Allow anyone to read glossary definitions" ON public.glossary_definitions
    FOR SELECT USING (true);

-- Cho phép người dùng đã xác thực thêm mới (INSERT) định nghĩa thuật ngữ
CREATE POLICY "Allow authenticated users to insert glossary definitions" ON public.glossary_definitions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

