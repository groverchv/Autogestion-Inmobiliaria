import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
import traceback

try:
    c = Client()
    res = c.post('/api/token/', {'username': 'admin', 'password': 'admin123'})
    data = res.json()
    if 'access' in data:
        token = data['access']
        print("Got token")
        res2 = c.get('/api/inmuebles/panel/lista/', HTTP_AUTHORIZATION='Bearer ' + token)
        print("STATUS:", res2.status_code)
        print("CONTENT:", res2.content.decode())
    else:
        print("NO TOKEN:", data)
except Exception as e:
    traceback.print_exc()
