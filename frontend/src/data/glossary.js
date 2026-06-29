// Glossary definitions for Academic Entity Protection and Tooltips

export const GLOSSARY = {
  "linked list": {
    term: "Linked List",
    translation: "Danh sách liên kết",
    definition: "Một cấu trúc dữ liệu tuyến tính trong đó các phần tử được lưu trữ dưới dạng các nút (node), mỗi nút chứa dữ liệu và một tham chiếu (con trỏ) đến nút kế tiếp.",
    category: "Data Structures"
  },
  "gradient descent": {
    term: "Gradient Descent",
    translation: "Cực tiểu hóa hàm mất mát (Thuật toán xuống dốc)",
    definition: "Một thuật toán tối ưu hóa lặp để tìm giá trị tối thiểu của một hàm số (thường là hàm mất mát trong Machine Learning) bằng cách đi theo hướng ngược lại của đạo hàm.",
    category: "Machine Learning"
  },
  "fastapi": {
    term: "FastAPI",
    translation: "FastAPI Web Framework",
    definition: "Một framework web Python hiện đại, hiệu năng cao để xây dựng các API RESTful, dựa trên cơ chế bất đồng bộ (async/await) và Pydantic để kiểm tra kiểu dữ liệu.",
    category: "Web Development"
  },
  "rest api": {
    term: "REST API",
    translation: "Giao diện lập trình REST",
    definition: "Kiến trúc thiết kế dịch vụ web dựa trên giao thức HTTP, sử dụng các phương thức như GET, POST, PUT, DELETE để thực hiện thao tác trên tài nguyên.",
    category: "Architecture"
  },
  "whisper": {
    term: "Whisper",
    translation: "Mô hình Whisper STT",
    definition: "Một mô hình nhận dạng giọng nói tự động (Speech-to-Text) tiên tiến được phát triển bởi OpenAI, có khả năng dịch và chuyển ngữ trực tiếp từ âm thanh giọng nói.",
    category: "AI Models"
  },
  "gemini": {
    term: "Gemini",
    translation: "Mô hình ngôn ngữ Gemini",
    definition: "Dòng mô hình AI đa phương thức (multimodal LLM) thế hệ mới nhất của Google, hỗ trợ xử lý đồng thời văn bản, mã nguồn, âm thanh, hình ảnh và video.",
    category: "AI Models"
  },
  "rag": {
    term: "RAG",
    translation: "Retrieval-Augmented Generation (Tăng cường truy xuất)",
    definition: "Kỹ thuật tối ưu hóa đầu ra của mô hình ngôn ngữ lớn (LLM) bằng cách truy vấn thông tin từ một cơ sở tri thức bên ngoài đáng tin cậy trước khi tạo phản hồi.",
    category: "AI Architectures"
  },
  "vector database": {
    term: "Vector Database",
    translation: "Cơ sở dữ liệu Vector",
    definition: "Cơ sở dữ liệu chuyên dụng dùng để lưu trữ và truy vấn nhanh các vector nhúng (embeddings) biểu diễn ngữ nghĩa của dữ liệu, phục vụ tìm kiếm tương đồng.",
    category: "Databases"
  },
  "chromadb": {
    term: "ChromaDB",
    translation: "Cơ sở dữ liệu Chroma",
    definition: "Một cơ sở dữ liệu vector mã nguồn mở gọn nhẹ, dễ nhúng vào các ứng dụng Python và JavaScript để lưu trữ thông tin cho hệ thống AI.",
    category: "Databases"
  },
  "qdrant": {
    term: "Qdrant",
    translation: "Công cụ tìm kiếm vector Qdrant",
    definition: "Một dịch vụ cơ sở dữ liệu vector hiệu năng cao được viết bằng ngôn ngữ Rust, hỗ trợ API REST/gRPC để tìm kiếm ngữ nghĩa với quy mô lớn.",
    category: "Databases"
  },
  "loss function": {
    term: "Loss Function",
    translation: "Hàm mất mát / Hàm chi phí",
    definition: "Hàm số dùng để đo lường mức độ sai lệch giữa kết quả dự đoán của mô hình học máy và giá trị thực tế, là cơ sở để điều chỉnh tham số mô hình.",
    category: "Machine Learning"
  },
  "few-shot prompting": {
    term: "Few-Shot Prompting",
    translation: "Gợi ý vài mẫu (Few-Shot)",
    definition: "Kỹ thuật viết câu lệnh prompt trong đó cung cấp sẵn một vài ví dụ minh họa về đầu vào và đầu ra mong muốn để hướng dẫn LLM hoạt động chính xác.",
    category: "Prompt Engineering"
  },
  "asynchronous": {
    term: "Asynchronous",
    translation: "Bất đồng bộ (Async)",
    definition: "Mô hình thực thi code cho phép chương trình bắt đầu một tác vụ tốn thời gian (như I/O) và tiếp tục thực hiện các việc khác mà không cần đợi tác vụ đó xong.",
    category: "Programming"
  },
  "embedding": {
    term: "Embedding",
    translation: "Nhúng vector (Biểu diễn ngữ nghĩa)",
    definition: "Quá trình biểu diễn các đối tượng dữ liệu như từ ngữ, tài liệu, hình ảnh dưới dạng các vector số thực trong không gian nhiều chiều để máy tính hiểu được ngữ nghĩa.",
    category: "Machine Learning"
  },
  "semantic search": {
    term: "Semantic Search",
    translation: "Tìm kiếm ngữ nghĩa",
    definition: "Kỹ thuật tìm kiếm thông tin dựa trên ý nghĩa ngữ nghĩa và ngữ cảnh của câu hỏi thay vì chỉ so khớp từng từ khóa thuần túy.",
    category: "Search Engines"
  },
  "data structure": {
    term: "Data Structure",
    translation: "Cấu trúc dữ liệu",
    definition: "Cách sắp xếp, tổ chức và lưu trữ dữ liệu trong máy tính để có thể truy cập và sửa đổi một cách hiệu quả.",
    category: "Computer Science"
  },
  "neural network": {
    term: "Neural Network",
    translation: "Mạng thần kinh nhân tạo",
    definition: "Một mô hình tính toán lấy cảm hứng từ cấu trúc não bộ sinh học, gồm nhiều lớp nút liên kết với nhau dùng để nhận dạng mẫu và giải quyết bài toán phức tạp.",
    category: "Machine Learning"
  },
  "machine learning": {
    term: "Machine Learning",
    translation: "Học máy",
    definition: "Một phân ngành của AI cho phép hệ thống tự động học hỏi và cải thiện hiệu suất từ kinh nghiệm (dữ liệu) mà không cần được lập trình chi tiết.",
    category: "Computer Science"
  },
  "deep learning": {
    term: "Deep Learning",
    translation: "Học sâu",
    definition: "Một nhánh sâu hơn của Machine Learning sử dụng các mạng thần kinh nhân tạo nhiều lớp (deep neural networks) để mô hình hóa các biểu diễn phức tạp của dữ liệu.",
    category: "Machine Learning"
  },
  "algorithm": {
    term: "Algorithm",
    translation: "Thuật toán / Giải thuật",
    definition: "Một tập hợp hữu hạn các chỉ dẫn rõ ràng để giải quyết một bài toán cụ thể hay thực hiện một phép tính.",
    category: "Computer Science"
  },
  "opportunity cost": {
    term: "Opportunity Cost",
    translation: "Chi phí cơ hội",
    definition: "Giá trị của sự lựa chọn tốt nhất khác bị bỏ qua khi đưa ra một quyết định kinh tế.",
    category: "Economics"
  },
  "supply and demand": {
    term: "Supply and Demand",
    translation: "Cung và cầu",
    definition: "Mối quan hệ giữa lượng hàng hóa mà người sản xuất muốn bán và lượng hàng hóa mà người tiêu dùng muốn mua tại các mức giá khác nhau.",
    category: "Economics"
  },
  "microeconomics": {
    term: "Microeconomics",
    translation: "Kinh tế vi mô",
    definition: "Một nhánh của kinh tế học nghiên cứu hành vi của các cá nhân và doanh nghiệp trong việc đưa ra các quyết định phân bổ nguồn lực khan hiếm.",
    category: "Economics"
  },
  "equilibrium price": {
    term: "Equilibrium Price",
    translation: "Giá cân bằng",
    definition: "Mức giá tại đó sản lượng cung cấp bằng với sản lượng nhu cầu, làm sạch thị trường mà không thừa hay thiếu hụt hàng hóa.",
    category: "Economics"
  }
};
