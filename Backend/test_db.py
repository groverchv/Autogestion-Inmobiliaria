import psycopg2
import sys

try:
    conn = psycopg2.connect(
        dbname='autogestion', 
        user='postgres', 
        password='muerte', 
        host='localhost', 
        port='5432'
    )
    print("Conexion exitosa!!")
except Exception as e:
    # Capturamos el error sin que se muera por UnicodeDecodeError
    # Postgres a veces manda en cp1252/latin1
    msg = str(e).encode('utf-8', 'ignore').decode('utf-8', 'ignore')
    print("Error de PostgreSQL:", msg)
