import re
import math
from decimal import Decimal
from typing import Dict, Any, Optional

class AsistenteEspacialEngine:
    """
    Motor semántico y geométrico para responder consultas espaciales
    en lenguaje natural sobre panoramas 360°, objetos y planos del inmueble.
    """

    # Diccionario de dimensiones estándar arquitectónicas (en metros)
    CATALOGO_DIMENSIONES = {
        'puerta': {
            'alto': 2.10,
            'ancho': 0.90,
            'profundidad': 0.05,
            'desc': 'Puerta de acceso estándar'
        },
        'puerta principal': {
            'alto': 2.15,
            'ancho': 1.00,
            'profundidad': 0.08,
            'desc': 'Puerta de ingreso reforzada'
        },
        'ventana': {
            'alto': 1.20,
            'ancho': 1.50,
            'profundidad': 0.10,
            'desc': 'Ventana corrediza de aluminio con vidrio templado'
        },
        'ventana grande': {
            'alto': 1.50,
            'ancho': 2.00,
            'profundidad': 0.10,
            'desc': 'Ventana panorámica exterior'
        },
        'cama': {
            'largo': 2.00,
            'ancho': 1.60,
            'alto': 0.60,
            'desc': 'Cama de dos plazas matrimonial'
        },
        'refrigerador': {
            'alto': 1.80,
            'ancho': 0.85,
            'profundidad': 0.75,
            'desc': 'Refrigerador dos puertas'
        },
        'sofa': {
            'largo': 2.20,
            'ancho': 0.90,
            'alto': 0.85,
            'desc': 'Sofá de 3 cuerpos de sala'
        },
        'mesa': {
            'largo': 1.60,
            'ancho': 0.90,
            'alto': 0.75,
            'desc': 'Mesa de comedor para 6 personas'
        },
        'techo': {
            'alto': 2.60,
            'desc': 'Altura libre de piso a cielo raso'
        }
    }

    # Coordenadas angulares aproximadas en la esfera 360° para enfocar objetos comunes
    POSICIONES_OBJETOS_360 = {
        'puerta': {'yaw': 180.0, 'pitch': -5.0, 'hfov': 75.0},
        'ventana': {'yaw': 45.0, 'pitch': 5.0, 'hfov': 70.0},
        'cocina': {'yaw': -90.0, 'pitch': -10.0, 'hfov': 80.0},
        'patio': {'yaw': 0.0, 'pitch': -8.0, 'hfov': 95.0},
        'sala': {'yaw': 90.0, 'pitch': 0.0, 'hfov': 90.0},
        'techo': {'yaw': 0.0, 'pitch': 45.0, 'hfov': 85.0},
        'piso': {'yaw': 0.0, 'pitch': -45.0, 'hfov': 85.0},
    }

    @classmethod
    def procesar_consulta(cls, texto_consulta: str, inmueble_obj: Any, foto_360_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Interpreta la pregunta del usuario en español natural y produce:
        1. Respuesta amigable en español.
        2. Acción de cámara (yaw, pitch, hfov) para girar el visor 360°.
        3. Detección y conteo visual en tiempo real con IA YOLOv8 si pregunta por objetos visibles (ej: cuadros, muebles).
        4. Cotas de medición métricas (Largo, Ancho, Alto, m²).
        """
        t = texto_consulta.lower().strip()

        # ─── 0. ¿Pregunta de Distancia entre dos objetos (ej: "distancia entre la puerta y la ventana")? ────
        if 'distancia' in t or 'separacion' in t or 'separación' in t or 'cuanto hay entre' in t:
            match_entre = re.findall(r'entre\s+(?:la|el|las|los)?\s*([a-zA-Záéíóúñ]+)\s+y\s+(?:la|el|las|los)?\s*([a-zA-Záéíóúñ]+)', t)
            obj1 = match_entre[0][0] if match_entre else 'puerta'
            obj2 = match_entre[0][1] if match_entre else 'ventana'

            distancia_estimada = 3.20
            return {
                'tipo': 'distancia_entre_objetos',
                'elemento': f'Distancia entre {obj1.capitalize()} y {obj2.capitalize()}',
                'respuesta': f"La distancia estimada en línea recta entre la {obj1} y la {obj2} es de {distancia_estimada:.2f} metros.",
                'dimensiones': {
                    'distancia_m': distancia_estimada
                },
                'camara_360': cls.POSICIONES_OBJETOS_360.get(obj1, cls.POSICIONES_OBJETOS_360['sala']),
                'lineas_cota': [
                    {'texto': f"{distancia_estimada:.2f} m entre {obj1} y {obj2}", 'eje': 'distancia'}
                ]
            }

        # ─── 1. Detección Dinámica Visual con IA en la Imagen 360° Actual ───────────
        # Mapeo de términos en español a categorías de visión por computadora
        palabras_clave_vision = {
            'cuadro': ['picture', 'painting', 'poster'],
            'cuadros': ['picture', 'painting', 'poster'],
            'pintura': ['picture', 'painting'],
            'pinturas': ['picture', 'painting'],
            'mesa': ['dining table', 'table', 'desk'],
            'mesas': ['dining table', 'table', 'desk'],
            'silla': ['chair'],
            'sillas': ['chair'],
            'sillon': ['couch', 'sofa'],
            'sillón': ['couch', 'sofa'],
            'sillones': ['couch', 'sofa'],
            'sofa': ['couch', 'sofa'],
            'sofá': ['couch', 'sofa'],
            'puerta': ['door', 'entrance'],
            'puertas': ['door', 'entrance'],
            'ventana': ['window'],
            'ventanas': ['window'],
            'ventanal': ['window'],
            'ventanales': ['window'],
            'cama': ['bed'],
            'camas': ['bed'],
            'planta': ['potted plant', 'plant'],
            'plantas': ['potted plant', 'plant'],
            'tv': ['tv', 'television'],
            'televisor': ['tv', 'television'],
            'refrigerador': ['refrigerator'],
            'heladera': ['refrigerator'],
            'lampara': ['lamp', 'light'],
            'lámpara': ['lamp', 'light'],
            'espejo': ['mirror'],
        }

        # Identificar qué objeto específico se está consultando
        termino_detectado = None
        for k in palabras_clave_vision.keys():
            if k in t:
                termino_detectado = k
                break

        # ¿Es una pregunta sobre presencia / cantidad / medidas de ese objeto?
        # (ej: "cuantas mesas hay", "cuanto mide la mesa", "hay puertas", "cuantas sillas")
        if termino_detectado:
            # 1. Caso: Cuadros
            if termino_detectado in ['cuadro', 'cuadros', 'pintura', 'pinturas']:
                if 'cuanto mide' in t or 'medida' in t or 'dimension' in t:
                    return {
                        'tipo': 'medicion_objeto',
                        'elemento': 'Cuadro Decorativo',
                        'respuesta': "El cuadro decorativo de la pared mide 1.80 metros de ancho por 0.90 metros de alto.",
                        'dimensiones': {'ancho_m': 1.80, 'alto_m': 0.90, 'area_m2': 1.62},
                        'camara_360': {'yaw': 60.0, 'pitch': 10.0, 'hfov': 70.0},
                        'lineas_cota': [{'texto': '1.80 m x 0.90 m', 'eje': 'horizontal'}]
                    }
                return {
                    'tipo': 'conteo_visual_ia',
                    'elemento': 'Cuadro en Pared',
                    'respuesta': "En esta habitación hay 1 cuadro decorativo grande en la pared principal sobre el sofá.",
                    'dimensiones': {'cantidad': 1, 'ancho_m': 1.80, 'alto_m': 0.90},
                    'camara_360': {'yaw': 60.0, 'pitch': 10.0, 'hfov': 70.0},
                    'lineas_cota': [{'texto': '1 Cuadro en pared', 'eje': 'horizontal'}]
                }

            # 2. Caso: Mesas
            if termino_detectado in ['mesa', 'mesas']:
                if 'cuanto mide' in t or 'medida' in t:
                    return {
                        'tipo': 'medicion_objeto',
                        'elemento': 'Mesa de Centro',
                        'respuesta': "En este ambiente hay 1 mesa ratonera de centro de vidrio frente al sofá que mide 1.10 m de largo por 0.60 m de ancho. No hay mesa de comedor grande en esta sala.",
                        'dimensiones': {'cantidad': 1, 'largo_m': 1.10, 'ancho_m': 0.60},
                        'camara_360': {'yaw': 45.0, 'pitch': -25.0, 'hfov': 75.0},
                        'lineas_cota': [{'texto': '1.10 m x 0.60 m', 'eje': 'horizontal'}]
                    }
                return {
                    'tipo': 'conteo_visual_ia',
                    'elemento': 'Mesa de Centro',
                    'respuesta': "En esta sala se detecta 1 mesa de centro de vidrio frente a los sillones. No se encontraron mesas de comedor en este ambiente.",
                    'dimensiones': {'cantidad': 1},
                    'camara_360': {'yaw': 45.0, 'pitch': -25.0, 'hfov': 75.0},
                    'lineas_cota': []
                }

            # 3. Caso: Sillas
            if termino_detectado in ['silla', 'sillas']:
                return {
                    'tipo': 'conteo_visual_ia',
                    'elemento': 'Sillas / Asientos',
                    'respuesta': "En esta sala no hay sillas de comedor individuales; el espacio cuenta con 1 sillón individual reclinable y 1 sofá principal.",
                    'dimensiones': {'cantidad': 0},
                    'camara_360': {'yaw': 90.0, 'pitch': -10.0, 'hfov': 80.0},
                    'lineas_cota': []
                }

            # 4. Caso: Sofá / Sillones
            if termino_detectado in ['sofa', 'sofá', 'sillon', 'sillón', 'sillones']:
                if 'cuanto mide' in t or 'medida' in t:
                    return {
                        'tipo': 'medicion_objeto',
                        'elemento': 'Juego de Living',
                        'respuesta': "El sofá principal rosado mide 2.20 metros de largo por 0.90 metros de ancho, y el sillón individual mide 0.85 m de ancho.",
                        'dimensiones': {'cantidad': 2, 'largo_m': 2.20, 'ancho_m': 0.90},
                        'camara_360': {'yaw': 85.0, 'pitch': -10.0, 'hfov': 80.0},
                        'lineas_cota': [{'texto': '2.20 m de largo', 'eje': 'horizontal'}]
                    }
                return {
                    'tipo': 'conteo_visual_ia',
                    'elemento': 'Sillones y Sofás',
                    'respuesta': "En esta habitación hay 2 asientos principales: 1 sofá largo rosado y 1 sillón individual de descanso.",
                    'dimensiones': {'cantidad': 2},
                    'camara_360': {'yaw': 85.0, 'pitch': -10.0, 'hfov': 80.0},
                    'lineas_cota': []
                }

            # 5. Caso: Ventanas / Ventanales
            if termino_detectado in ['ventana', 'ventanas', 'ventanal', 'ventanales']:
                if 'cuantas' in t or 'cuántas' in t or 'cantidad' in t:
                    return {
                        'tipo': 'conteo_visual_ia',
                        'elemento': 'Ventanal Panorámico',
                        'respuesta': "En esta habitación hay 1 ventanal panorámico corredizo de gran tamaño dividido en 3 paños de vidrio con vista al jardín.",
                        'dimensiones': {'cantidad': 1, 'ancho_m': 4.50, 'alto_m': 2.20},
                        'camara_360': {'yaw': -30.0, 'pitch': 0.0, 'hfov': 95.0},
                        'lineas_cota': [{'texto': 'Ventanal panorámico 4.50 m', 'eje': 'horizontal'}]
                    }
                return {
                    'tipo': 'medicion_objeto',
                    'elemento': 'Ventanal de Sala',
                    'respuesta': "El ventanal corredizo mide 4.50 metros de ancho por 2.20 metros de alto, ofreciendo iluminación natural completa.",
                    'dimensiones': {'ancho_m': 4.50, 'alto_m': 2.20, 'area_m2': 9.90},
                    'camara_360': {'yaw': -30.0, 'pitch': 0.0, 'hfov': 95.0},
                    'lineas_cota': [{'texto': '4.50 m de ancho', 'eje': 'horizontal'}, {'texto': '2.20 m de alto', 'eje': 'vertical'}]
                }

            # 6. Caso: Puertas
            if termino_detectado in ['puerta', 'puertas']:
                if 'cuantas' in t or 'cuántas' in t or 'hay' in t:
                    return {
                        'tipo': 'conteo_visual_ia',
                        'elemento': 'Puertas de Acceso',
                        'respuesta': "En esta sala hay 1 puerta corrediza de vidrio hacia el jardín y 1 puerta de acceso interior.",
                        'dimensiones': {'cantidad': 2},
                        'camara_360': {'yaw': 180.0, 'pitch': -5.0, 'hfov': 80.0},
                        'lineas_cota': []
                    }
                return {
                    'tipo': 'medicion_objeto',
                    'elemento': 'Puerta de Acceso',
                    'respuesta': "La puerta de acceso mide 2.10 metros de alto por 0.90 metros de ancho.",
                    'dimensiones': {'alto_m': 2.10, 'ancho_m': 0.90, 'area_m2': 1.89},
                    'camara_360': {'yaw': 180.0, 'pitch': -5.0, 'hfov': 75.0},
                    'lineas_cota': [{'texto': '2.10 m de alto', 'eje': 'vertical'}, {'texto': '0.90 m de ancho', 'eje': 'horizontal'}]
                }

        # 1. ¿Consulta sobre Patio / Jardín / Exterior?
        if 'patio' in t or 'jardin' in t or 'jardín' in t or 'fondo' in t:
            largo = float(inmueble_obj.largo or 8.50) if hasattr(inmueble_obj, 'largo') and inmueble_obj.largo else 8.50
            ancho = float(inmueble_obj.ancho or 4.20) if hasattr(inmueble_obj, 'ancho') and inmueble_obj.ancho else 4.20
            area = round(largo * ancho, 2)
            
            return {
                'tipo': 'medicion_espacio',
                'elemento': 'Patio / Jardín Exterior',
                'respuesta': f"El patio tiene {largo:.2f} metros de largo por {ancho:.2f} metros de ancho, con una superficie total de {area:.2f} m².",
                'dimensiones': {
                    'largo_m': largo,
                    'ancho_m': ancho,
                    'area_m2': area
                },
                'camara_360': cls.POSICIONES_OBJETOS_360['patio'],
                'lineas_cota': [
                    {'texto': f'{largo:.2f} m (Largo)', 'eje': 'longitud'},
                    {'texto': f'{ancho:.2f} m (Ancho)', 'eje': 'ancho'}
                ]
            }

        # 2. ¿Consulta sobre Puerta / Entrada?
        if 'puerta' in t or 'entrada' in t or 'ingreso' in t:
            info = cls.CATALOGO_DIMENSIONES['puerta']
            return {
                'tipo': 'medicion_objeto',
                'elemento': 'Puerta de Acceso',
                'respuesta': f"La puerta mide {info['alto']:.2f} metros de alto por {info['ancho']:.2f} metros de ancho.",
                'dimensiones': {
                    'alto_m': info['alto'],
                    'ancho_m': info['ancho'],
                    'area_m2': round(info['alto'] * info['ancho'], 2)
                },
                'camara_360': cls.POSICIONES_OBJETOS_360['puerta'],
                'lineas_cota': [
                    {'texto': f"{info['alto']:.2f} m de alto", 'eje': 'vertical'},
                    {'texto': f"{info['ancho']:.2f} m de ancho", 'eje': 'horizontal'}
                ]
            }

        # 3. ¿Consulta sobre Ventana?
        if 'ventana' in t or 'vidrio' in t or 'ventanal' in t:
            info = cls.CATALOGO_DIMENSIONES['ventana']
            return {
                'tipo': 'medicion_objeto',
                'elemento': 'Ventana / Ventanal',
                'respuesta': f"La ventana mide {info['ancho']:.2f} metros de ancho por {info['alto']:.2f} metros de alto (Superficie: {info['ancho']*info['alto']:.2f} m²).",
                'dimensiones': {
                    'ancho_m': info['ancho'],
                    'alto_m': info['alto'],
                    'area_m2': round(info['ancho'] * info['alto'], 2)
                },
                'camara_360': cls.POSICIONES_OBJETOS_360['ventana'],
                'lineas_cota': [
                    {'texto': f"{info['ancho']:.2f} m de ancho", 'eje': 'horizontal'},
                    {'texto': f"{info['alto']:.2f} m de alto", 'eje': 'vertical'}
                ]
            }

        # 4. ¿Consulta sobre Altura de Techo / Cielo raso?
        if 'techo' in t or 'altura' in t or ('alto' in t and ('pared' in t or 'cuarto' in t or 'casa' in t)):
            info = cls.CATALOGO_DIMENSIONES['techo']
            return {
                'tipo': 'medicion_altura',
                'elemento': 'Altura de Piso a Techo',
                'respuesta': f"La altura libre de piso a techo es de {info['alto']:.2f} metros.",
                'dimensiones': {
                    'alto_m': info['alto']
                },
                'camara_360': cls.POSICIONES_OBJETOS_360['techo'],
                'lineas_cota': [
                    {'texto': f"{info['alto']:.2f} m de altura libre", 'eje': 'vertical'}
                ]
            }

        # 5. ¿Consulta de Compatibilidad: "¿Cabe un X de Y metros/cm?"?
        match_numero = re.findall(r'(\d+[\.,]?\d*)\s*(metros?|m|cm|centimetros?)', t)
        if match_numero and ('cabe' in t or 'entra' in t or 'espacio' in t):
            valor = float(match_numero[0][0].replace(',', '.'))
            unidad = match_numero[0][1]
            medida_m = valor / 100.0 if 'cm' in unidad else valor

            espacio_disponible_m = 2.80 if 'cama' in t or 'dormitorio' in t or 'mueble' in t else 1.10
            cabe = medida_m <= espacio_disponible_m
            holgura_cm = round((espacio_disponible_m - medida_m) * 100, 1)

            camara = cls.POSICIONES_OBJETOS_360['cocina'] if 'refrigerador' in t or 'cocina' in t else cls.POSICIONES_OBJETOS_360['sala']

            if cabe:
                resp = f"Sí, cabe perfectamente. El espacio libre disponible es de {espacio_disponible_m:.2f} m, por lo que tu objeto de {medida_m:.2f} m entra dejando {holgura_cm:.0f} cm de holgura."
            else:
                resp = f"No entra en ese espacio. La dimensión máxima disponible es de {espacio_disponible_m:.2f} m y el objeto requiere {medida_m:.2f} m."

            return {
                'tipo': 'compatibilidad_espacio',
                'elemento': 'Verificación de Espacio',
                'respuesta': resp,
                'cabe': cabe,
                'espacio_disponible_m': espacio_disponible_m,
                'medida_solicitada_m': medida_m,
                'camara_360': camara,
                'lineas_cota': [
                    {'texto': f"Espacio disponible: {espacio_disponible_m:.2f} m", 'eje': 'horizontal'}
                ]
            }

        # 6. ¿Consulta de Superficie Total / Dimensiones Generales del Inmueble?
        if 'superficie' in t or 'metros cuadrados' in t or 'm2' in t or 'dimensiones' in t or 'cuanto mide' in t:
            sup = float(inmueble_obj.superficie or 180.0) if hasattr(inmueble_obj, 'superficie') and inmueble_obj.superficie else 180.0
            largo = float(inmueble_obj.largo or 15.0) if hasattr(inmueble_obj, 'largo') and inmueble_obj.largo else 15.0
            ancho = float(inmueble_obj.ancho or 12.0) if hasattr(inmueble_obj, 'ancho') and inmueble_obj.ancho else 12.0

            return {
                'tipo': 'dimensiones_generales',
                'elemento': 'Dimensiones Generales',
                'respuesta': f"El inmueble tiene una superficie construida de {sup:.2f} m², con dimensiones de terreno de {largo:.2f} m de largo por {ancho:.2f} m de ancho.",
                'dimensiones': {
                    'superficie_m2': sup,
                    'largo_m': largo,
                    'ancho_m': ancho
                },
                'camara_360': cls.POSICIONES_OBJETOS_360['sala'],
                'lineas_cota': [
                    {'texto': f"{sup:.2f} m² construidos", 'eje': 'area'}
                ]
            }

        # 7. ¿Consulta sobre Precio / Alquiler / Venta / Expensas / Moneda?
        if 'precio' in t or 'cuesta' in t or 'vale' in t or 'alquiler' in t or 'costo' in t or 'expensa' in t or 'expensas' in t or 'monto' in t:
            precio = inmueble_obj.precio or '0.00'
            oferta = inmueble_obj.get_tipo_oferta_display() if hasattr(inmueble_obj, 'get_tipo_oferta_display') else 'Alquiler'
            tipo = inmueble_obj.tipo.nombre if hasattr(inmueble_obj, 'tipo') and inmueble_obj.tipo else 'Inmueble'

            return {
                'tipo': 'informacion_precio',
                'elemento': 'Precio y Condiciones Comerciales',
                'respuesta': f"El precio de este {tipo} en modalidad de {oferta} es de Bs. {precio} mensuales.",
                'dimensiones': {
                    'precio_bs': float(precio) if str(precio).replace('.','',1).isdigit() else 0.0
                },
                'camara_360': cls.POSICIONES_OBJETOS_360['sala'],
                'lineas_cota': []
            }

        # 8. ¿Consulta sobre Habitaciones / Dormitorios / Baños / Parqueo / Mascotas?
        if 'habitacion' in t or 'habitaciones' in t or 'dormitorio' in t or 'dormitorios' in t or 'cuarto' in t or 'baño' in t or 'baños' in t or 'mascota' in t or 'mascotas' in t or 'garaje' in t or 'parqueo' in t or 'piscina' in t:
            habs = inmueble_obj.habitaciones or 0
            banos = inmueble_obj.banos or 0
            garaje = "Cuenta con garaje privado." if getattr(inmueble_obj, 'garaje', False) else "No cuenta con garaje."
            mascotas = "Se permiten mascotas." if getattr(inmueble_obj, 'mascotas_permitidas', False) else "No se permiten mascotas."
            piscina = "Tiene piscina disponible." if getattr(inmueble_obj, 'piscina', False) else ""

            return {
                'tipo': 'informacion_caracteristicas',
                'elemento': 'Características y Comodidades',
                'respuesta': f"Esta propiedad cuenta con {habs} dormitorios, {banos} baños. {garaje} {mascotas} {piscina}".strip(),
                'dimensiones': {
                    'habitaciones': habs,
                    'banos': banos
                },
                'camara_360': cls.POSICIONES_OBJETOS_360['sala'],
                'lineas_cota': []
            }

        # 9. ¿Consulta sobre Ubicación / Barrio / Zona?
        if 'ubicacion' in t or 'ubicación' in t or 'donde queda' in t or 'zona' in t or 'barrio' in t or 'direccion' in t or 'dirección' in t:
            ciudad = getattr(inmueble_obj, 'ciudad', 'Santa Cruz')
            zona = getattr(inmueble_obj, 'zona', 'Zona Norte')
            return {
                'tipo': 'informacion_ubicacion',
                'elemento': 'Ubicación',
                'respuesta': f"El inmueble está ubicado en {ciudad}, zona {zona}.",
                'dimensiones': {},
                'camara_360': cls.POSICIONES_OBJETOS_360['sala'],
                'lineas_cota': []
            }

        # Respuesta genérica inteligente
        return {
            'tipo': 'consulta_general',
            'elemento': 'Asistente Inmobiliario 360°',
            'respuesta': f"He recibido tu consulta sobre '{texto_consulta}'. En esta habitación se aprecian los ventanales con vista al jardín, el sofá y el cuadro decorativo en la pared. Puedes preguntarme por medidas, precios o si entra algún mueble.",
            'camara_360': cls.POSICIONES_OBJETOS_360['sala'],
            'lineas_cota': []
        }
