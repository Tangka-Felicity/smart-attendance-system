import urllib.request

req = urllib.request.Request('http://localhost:8000/health')
req.add_header('Origin', 'http://localhost:5174')
with urllib.request.urlopen(req) as r:
    print('status', r.status)
    print('headers', r.getheaders())
    print('body', r.read().decode())
