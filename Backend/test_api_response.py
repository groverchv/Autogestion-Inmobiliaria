import os
import django
import sys
from django.test import RequestFactory
from django.contrib.auth import get_user_model

# Setup Django
sys.path.append('d:\\HDD\DOCS\\docs\\Universidad\\ING SOFTWARE 1\\PROYECTO INMOBILIARIO\\Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from pagos.views import ReportesAPIView

def test_api():
    User = get_user_model()
    admin = User.objects.get(email='admin@autogestion.bo')
    
    factory = RequestFactory()
    # Test for 2026
    request = factory.get('/api/pagos/reportes/', {'anio': '2026'})
    request.user = admin
    
    view = ReportesAPIView.as_view()
    response = view(request)
    
    print("API Response for 2026:", response.data)

if __name__ == '__main__':
    test_api()
