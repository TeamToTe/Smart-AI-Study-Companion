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
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
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
            data = response.json()
            reply_text = data.get("response", "")
            
            print("\nResponse from AI Tutor (Printed in Console):")
            print(reply_text)
            
            # Save response to a markdown file for easy viewing
            output_file = "chat_response.md"
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(reply_text)
            print(f"\n[SUCCESS] Saved full response to file: scratch/{output_file}")
        else:
            print(f"Error details: {response.text}")
    except Exception as e:
        print(f"Failed to connect to backend or process: {e}")

if __name__ == "__main__":
    test_chat()
