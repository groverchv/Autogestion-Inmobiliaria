from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inmuebles', '0023_indexes_rendimiento'),
    ]

    operations = [
        TrigramExtension(),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS inm_titulo_trgm ON inmuebles_inmueble USING GIN (titulo gin_trgm_ops)",
            reverse_sql="DROP INDEX IF EXISTS inm_titulo_trgm",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS dir_ciudad_trgm ON inmuebles_direccion USING GIN (ciudad gin_trgm_ops)",
            reverse_sql="DROP INDEX IF EXISTS dir_ciudad_trgm",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS dir_zona_trgm ON inmuebles_direccion USING GIN (zona gin_trgm_ops)",
            reverse_sql="DROP INDEX IF EXISTS dir_zona_trgm",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS dir_calle_trgm ON inmuebles_direccion USING GIN (calle gin_trgm_ops)",
            reverse_sql="DROP INDEX IF EXISTS dir_calle_trgm",
        ),
    ]
