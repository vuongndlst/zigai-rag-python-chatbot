# Python GPT RAG Chatbot

## Tổng quan

Chào mừng bạn đến với **Python GPT RAG Chatbot** – một chatbot AI sinh văn bản (Generative AI) hỗ trợ học sinh trung học phổ thông (THPT) trong việc học lập trình Python. Ứng dụng này sử dụng các công nghệ hiện đại như **Retriever-Augmented Generation (RAG)**, **LangChain.js**, **Next.js**, **OpenAI**, **Astra Vector DB** để tạo nên một trợ lý học tập mạnh mẽ, dễ sử dụng và cập nhật liên tục từ tài liệu thật.

### Tính năng nổi bật

- **Tích hợp dữ liệu tuỳ chỉnh**: Thu thập và chuyển đổi các tài liệu Python phổ biến thành vector embeddings.
- **Hỏi đáp theo ngữ cảnh RAG**: Kết hợp dữ liệu thu thập được với GPT-4 để đưa ra câu trả lời chính xác, tự nhiên.
- **Dễ triển khai và mở rộng**: Dùng Next.js và có thể triển khai nhanh chóng với Vercel.
- **Lưu trữ thông minh**: Dữ liệu được lưu dưới dạng vector trong Astra DB để truy xuất hiệu quả hơn.

---

## Mục lục

1. [Yêu cầu cần thiết](#yêu-cầu-cần-thiết)
2. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
3. [Cài đặt](#cài-đặt)
4. [Cách sử dụng](#cách-sử-dụng)
5. [Giải thích tính năng](#giải-thích-tính-năng)
6. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
7. [Triển khai](#triển-khai)
8. [Nguồn tham khảo](#nguồn-tham-khảo)

---

## Yêu cầu cần thiết

Trước khi bắt đầu, bạn cần chuẩn bị:

- **Node.js** (phiên bản mới nhất): kiểm tra bằng `node -v`
- **API Key từ OpenAI**: đăng ký tại [https://openai.com](https://openai.com)
- **Tài khoản DataStax Astra DB**: tạo tại [https://www.datastax.com/astra](https://www.datastax.com/astra)
- **Kiến thức cơ bản về Next.js** (React, server-side rendering)

---

## Công nghệ sử dụng

- **Frontend**: Next.js, TypeScript  
- **Backend**: Node.js  
- **AI & NLP**: LangChain.js, OpenAI GPT-4  
- **Cơ sở dữ liệu vector**: DataStax Astra DB  
- **Triển khai**: Vercel  
- **Thu thập dữ liệu**: Puppeteer  

---

### Cài đặt thư viện
```bash
npm install
```

### Tạo file `.env` với nội dung sau:
```env
ASTRA_DB_API_ENDPOINT=<API Endpoint từ Astra>
ASTRA_DB_APPLICATION_TOKEN=<Token ứng dụng từ Astra>
ASTRA_DB_NAMESPACE=default
ASTRA_DB_COLLECTION=db_python_rag
OPENAI_API_KEY=<API Key từ OpenAI>
```

### Nạp dữ liệu vào cơ sở dữ liệu
```bash
npm run seed
```

### Chạy ứng dụng ở chế độ phát triển
```bash
npm run dev
```

Truy cập chatbot tại `http://localhost:3000`

---

### Hoặc bạn có thể chạy lần lượt:
```bash
npm install 
npm install react@18 react-dom@18 --legacy-peer-deps
npm audit fix 
npm i puppeteer 
npm fund 
npm run seed        
npm run dev
```

---

## Cách sử dụng

1. Truy cập giao diện chatbot tại trình duyệt.
2. Sử dụng các câu hỏi gợi ý hoặc nhập câu hỏi Python bất kỳ.
3. Chatbot sẽ tìm kiếm thông tin phù hợp và đưa ra câu trả lời chính xác.

---

## Giải thích tính năng

### RAG (Retriever-Augmented Generation) là gì?

Đây là kỹ thuật giúp mô hình AI truy cập vào nguồn dữ liệu ngoài (ví dụ: tài liệu Python) để tăng độ chính xác và cập nhật kiến thức mới mà không cần huấn luyện lại mô hình.

### Vector Embeddings

Các đoạn văn bản về Python được chia nhỏ, mã hóa thành vector bằng OpenAI và lưu trữ trong Astra DB. Điều này giúp chatbot tìm đúng thông tin theo ngữ cảnh.

### Astra Vector Database

Là cơ sở dữ liệu lưu trữ và tìm kiếm vector theo độ tương đồng – giúp truy vấn nhanh, chính xác.

### Puppeteer

Dùng để tự động hóa việc thu thập dữ liệu từ các website tài liệu Python uy tín như: docs.python.org, realpython.com...

---

## Cấu trúc thư mục

```
python-gpt-chatbot/
├── src/
│   ├── app/            # Cấu trúc chính của Next.js
│   ├── components/     # Các component React có thể tái sử dụng
│   ├── scripts/        # Script dùng để thu thập và nạp dữ liệu
│   └── styles/         # CSS và style toàn cục
├── .env                # Biến môi trường
├── package.json        # Danh sách thư viện và lệnh npm
└── README.md           # Tài liệu hướng dẫn
```

---

## Triển khai

Triển khai lên **Vercel** rất đơn giản:

1. Đẩy code lên GitHub.
2. Kết nối GitHub với Vercel.
3. Thêm biến môi trường vào phần Settings của Vercel.
4. Bấm Deploy.

---

## Nguồn tham khảo

Dự án dựa trên khóa học của **Ana Kubo** và được tài trợ bởi **DataStax**.
