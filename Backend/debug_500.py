from django.test import Client
import json
c = Client()
res = c.post('/api/token/', {'username': 'admin', 'password': 'admin123'})
data = res.json()
if 'access' in data:
    token = data['access']
    res2 = c.get('/api/inmuebles/panel/lista/', HTTP_AUTHORIZATION='Bearer ' + token)
    print("STATUS:", res2.status_code)
    print("CONTENT:", res2.content.decode())
else:
    print("NO TOKEN:", data)
