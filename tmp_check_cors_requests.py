import requests

r = requests.get('http://localhost:8000/health', headers={'Origin': 'http://localhost:5174'})
print('status', r.status_code)
print('headers', r.headers)
print('body', r.text)
