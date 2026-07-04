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

-- 5. Bảng quản lý transcript chia sẻ (shared_transcripts)
CREATE TABLE IF NOT EXISTS public.shared_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token VARCHAR(64) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cloned_from_id UUID REFERENCES public.shared_transcripts(id) ON DELETE SET NULL,
    video_url TEXT NOT NULL,
    video_title TEXT,
    video_duration_seconds INTEGER,
    license_type VARCHAR(20) NOT NULL DEFAULT 'CC-BY-NC-SA',
    attribution_name VARCHAR(100),
    views_count INTEGER NOT NULL DEFAULT 0,
    clones_count INTEGER NOT NULL DEFAULT 0,
    avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    ratings_count INTEGER NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_transcripts_token ON public.shared_transcripts(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_transcripts_owner ON public.shared_transcripts(owner_id);

-- 6. Bảng lưu trữ phân đoạn của transcript chia sẻ (shared_transcript_segments)
CREATE TABLE IF NOT EXISTS public.shared_transcript_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shared_transcript_id UUID NOT NULL REFERENCES public.shared_transcripts(id) ON DELETE CASCADE,
    start_time NUMERIC(8, 3) NOT NULL,
    end_time NUMERIC(8, 3) NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    highlights TEXT[] DEFAULT '{}',
    sequence_number INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_segments_transcript_id ON public.shared_transcript_segments(shared_transcript_id, sequence_number);

-- 7. Bảng lưu trữ đánh giá và phản hồi của người dùng (shared_transcript_ratings)
CREATE TABLE IF NOT EXISTS public.shared_transcript_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shared_transcript_id UUID NOT NULL REFERENCES public.shared_transcripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_transcript_rating UNIQUE (shared_transcript_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_transcript_id ON public.shared_transcript_ratings(shared_transcript_id);

-- 8. Hàm trigger tự động cập nhật trung bình đánh giá
CREATE OR REPLACE FUNCTION public.fn_recalculate_shared_transcript_ratings()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public.shared_transcripts
        SET 
            avg_rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM public.shared_transcript_ratings WHERE shared_transcript_id = OLD.shared_transcript_id), 0.00),
            ratings_count = (SELECT COUNT(*) FROM public.shared_transcript_ratings WHERE shared_transcript_id = OLD.shared_transcript_id)
        WHERE id = OLD.shared_transcript_id;
        RETURN OLD;
    ELSE
        UPDATE public.shared_transcripts
        SET 
            avg_rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM public.shared_transcript_ratings WHERE shared_transcript_id = NEW.shared_transcript_id), 0.00),
            ratings_count = (SELECT COUNT(*) FROM public.shared_transcript_ratings WHERE shared_transcript_id = NEW.shared_transcript_id)
        WHERE id = NEW.shared_transcript_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_recalculate_ratings
AFTER INSERT OR UPDATE OR DELETE ON public.shared_transcript_ratings
FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_shared_transcript_ratings();

-- 9. Cấu hình Row Level Security (RLS) cho các bảng chia sẻ và đánh giá
ALTER TABLE public.shared_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_transcript_ratings ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách phân quyền (Policies)
CREATE POLICY "Allow public read on shared transcripts" ON public.shared_transcripts
    FOR SELECT USING (is_public = true);

CREATE POLICY "Allow owners full control on shared transcripts" ON public.shared_transcripts
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Allow public read on shared transcript segments" ON public.shared_transcript_segments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.shared_transcripts
            WHERE shared_transcripts.id = shared_transcript_segments.shared_transcript_id
              AND shared_transcripts.is_public = true
        )
    );

CREATE POLICY "Allow owners to manage segments" ON public.shared_transcript_segments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.shared_transcripts
            WHERE shared_transcripts.id = shared_transcript_segments.shared_transcript_id
              AND shared_transcripts.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow anyone to read ratings" ON public.shared_transcript_ratings
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert/update ratings" ON public.shared_transcript_ratings
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.role() = 'authenticated');


