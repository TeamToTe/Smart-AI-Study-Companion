// Mock transcript generator for demo mode (Harvard CS50, FastAPI, 3Blue1Brown Neural Networks)
export function getMockSegmentsForUrl(url) {
  const lowercaseUrl = url.toLowerCase();

  // 1. Harvard CS50: Linked List
  if (lowercaseUrl.includes("rbsgklaboim") || lowercaseUrl.includes("list") || lowercaseUrl.includes("cs50")) {
    return [
      { start: 0, end: 12, text: "Welcome back to CS50. Today we are going to explore data structures, specifically the linked list." },
      { start: 13, end: 28, text: "In computer science, a linked list is a linear data structure that consists of elements called nodes." },
      { start: 29, end: 44, text: "Unlike standard arrays, these nodes are not stored in contiguous chunks of memory." },
      { start: 45, end: 60, text: "Instead, each node has a pointer that holds the memory address of the next node in the list." },
      { start: 61, end: 75, text: "The first node is referred to as the head, and the final node points to NULL." },
      { start: 76, end: 92, text: "Let us see what happens when we want to insert a node. This operation is dynamic." },
      { start: 93, end: 110, text: "If we insert a node at the head of the list, we simply set the new node's next pointer to the current head." },
      { start: 111, end: 130, text: "Then, we update the head pointer to address the new node. This runs in O(1) constant time complexity." },
      { start: 131, end: 152, text: "If we delete a node, we must change the preceding node's pointer to bypass the deleted node." },
      { start: 153, end: 172, text: "This re-linking of pointers ensures memory is managed cleanly, avoiding memory leaks." },
      { start: 173, end: 195, text: "However, to search for a value in a linked list, we cannot use index arithmetic like arrays." },
      { start: 196, end: 215, text: "We must start at the head node and traverse through next pointers one-by-one." },
      { start: 216, end: 238, text: "Thus, the search time complexity is O(n), where n is the number of nodes in the list." },
      { start: 239, end: 260, text: "This trade-off is crucial to evaluate when designing software algorithms for datasets." }
    ];
  }

  // 2. FastAPI Tutorial
  if (lowercaseUrl.includes("tlkkmco9_p4") || lowercaseUrl.includes("fastapi")) {
    return [
      { start: 0, end: 14, text: "Welcome to this complete tutorial. We will build a production-ready API using the FastAPI framework." },
      { start: 15, end: 32, text: "FastAPI is a modern web framework designed for building REST APIs with Python 3.8+." },
      { start: 33, end: 48, text: "It is extremely fast, powered by Starlette for web routes and Uvicorn for ASGI execution." },
      { start: 49, end: 68, text: "One of its key features is declarative validation, which is handled automatically by Pydantic." },
      { start: 69, end: 85, text: "By using standard Python type hints, Pydantic parses and validates client inputs." },
      { start: 86, end: 104, text: "Let us define a schema for a new user request using Pydantic models." },
      { start: 105, end: 125, text: "If a request fails validation, FastAPI returns a 422 error detailing the invalid parameters." },
      { start: 126, end: 145, text: "FastAPI also supports native asynchronous programming out of the box using async/await." },
      { start: 146, end: 165, text: "We can define our endpoints as async def to handle I/O bound queries concurrently." },
      { start: 166, end: 185, text: "To create resources, we map endpoints to POST routers. Let us write @app.post() for users." },
      { start: 186, end: 205, text: "FastAPI also has a powerful dependency injection system declared via Depends()." },
      { start: 206, end: 228, text: "We can inject services, database sessions, or security protocols cleanly into our endpoint signatures." }
    ];
  }

  // 3. 3Blue1Brown Neural Network
  if (lowercaseUrl.includes("aircaruvnkk") || lowercaseUrl.includes("neural") || lowercaseUrl.includes("brown")) {
    return [
      { start: 0, end: 11, text: "What is a neural network? Let's break down the mathematical fundamentals from scratch." },
      { start: 12, end: 28, text: "A neural network consists of layers of nodes. We pass inputs, multiply them by weights, and add biases." },
      { start: 29, end: 45, text: "To evaluate our network's predictions against the actual target, we use a loss function." },
      { start: 46, end: 65, text: "The loss function measures the error. A smaller loss value means our neural predictions are accurate." },
      { start: 66, end: 89, text: "To train the network, we must minimize this loss function. That is where gradient descent comes in." },
      { start: 90, end: 104, text: "Gradient descent is an optimization algorithm that calculates the gradient direction of steepest descent." },
      { start: 105, end: 122, text: "We update our weights by taking a step proportional to the negative gradient slope." },
      { start: 123, end: 139, text: "The step size is controlled by a hyperparameter called the learning rate." },
      { start: 140, end: 158, text: "If the learning rate is too small, gradient descent takes too long to converge." },
      { start: 159, end: 178, text: "If the learning rate is too large, the optimizer may overshoot the minimum and diverge." },
      { start: 179, end: 198, text: "During the training loop, inputs are fed forward in the forward pass to compute output loss." },
      { start: 199, end: 218, text: "Then, the errors are propagated back in backpropagation, updating weights at each layer." },
      { start: 219, end: 238, text: "This cycle of updates iteratively decreases training loss, training our model to learn patterns." }
    ];
  }

  // 4. Default Fallback
  return [
    { start: 0, end: 10, text: "Welcome to StudyMind. Paste a valid technical YouTube lecture to load transcriptions." },
    { start: 11, end: 25, text: "This AI study companion is designed to protect academic entities and optimize technical translations." },
    { start: 26, end: 40, text: "You can hover over terms like linked list or gradient descent to see definitions." },
    { start: 41, end: 55, text: "Use the AI Tutor sidebar on the right to query the transcript context with timestamp seekers." },
    { start: 56, end: 75, text: "The app also compiles flashcards, quizzes, and a conceptual mindmap based on transcript facts." },
    { start: 76, end: 95, text: "Click on any timestamp or mindmap node to seek the video to that exact point." }
  ];
}
