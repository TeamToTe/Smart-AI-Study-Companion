import os
import requests
import json
from dotenv import load_dotenv

# Load env variables from root directory
load_dotenv(dotenv_path="../.env")

# Define mock transcript segments
mock_segments = [
    {
        "start": 0.0,
        "end": 15.5,
        "text": "Welcome to our lecture on data structures. Today we are introducing the concept of linked lists."
    },
    {
        "start": 16.0,
        "end": 35.0,
        "text": "Unlike standard arrays, a linked list consists of nodes, where each node contains data and a pointer to the next node."
    },
    {
        "start": 35.5,
        "end": 58.0,
        "text": "This structure allows us to perform efficient insertions and deletions. We will explore how memory allocations work in pointers."
    }
]

def test_chat():
    url = "http://127.0.0.1:8000/api/chat"
    payload = {
        "query": "What is a linked list and why do we use it over arrays? Please give the timestamp from the video.",
        "history": [],
        "segments": mock_segments
    }
    
    print("Sending payload to /api/chat...")
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("\nResponse from AI Tutor:")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print(f"Error details: {response.text}")
    except Exception as e:
        print(f"Failed to connect to backend: {e}")

if __name__ == "__main__":
    test_chat()
