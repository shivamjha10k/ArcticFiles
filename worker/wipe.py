import requests
import json

# Fetch all Qdrant points and delete them
resp = requests.post('http://localhost:6333/collections/files_chunks/points/delete', json={
    "filter": {
        "must": []
    }
})
print("Deleted all points from Qdrant:", resp.json())

# Also clear the search cache in the worker
requests.post('http://localhost:8081/cache/search/clear')
print("Cleared search cache")
