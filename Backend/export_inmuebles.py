import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from inmuebles.models import Inmueble

def list_inmuebles():
    inmuebles = Inmueble.objects.select_related('direccion_fk', 'tipo').all()
    header = "ID|Titulo|Precio|Largo|Ancho|Superficie|Hab.|Banos|Garaje|Estado|Ciudad|Zona|Calle|Referencia"
    print(header)
    for i in inmuebles:
        d = i.direccion_fk
        ciudad = d.ciudad if d else ""
        zona = d.zona if d else ""
        calle = d.calle if d else ""
        ref = d.referencia if d else ""
        
        row = [
            str(i.id),
            i.titulo,
            str(i.precio),
            str(i.largo),
            str(i.ancho),
            str(i.superficie),
            str(i.habitaciones),
            str(i.banos),
            "Sí" if i.garaje else "No",
            i.estado,
            ciudad,
            zona,
            calle,
            ref
        ]
        print("|".join(row))

if __name__ == "__main__":
    list_inmuebles()
