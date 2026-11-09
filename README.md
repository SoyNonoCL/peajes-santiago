# Peajes Santiago

App web instalable (PWA) que estima cuánto cuesta un recorrido por las autopistas de Santiago y las rutas interurbanas de la Región Metropolitana, según vehículo, pago con o sin TAG, día y hora.

**Usar:** https://soynonocl.github.io/peajes-santiago/ (en Android: menú de Chrome → *Agregar a la pantalla principal*).

## Cómo funciona
- Marcas origen, destino y paradas en el mapa. La ruta se traza con OSRM (OpenStreetMap).
- La app detecta los pórticos y plazas que cruzas, en qué sentido y a qué hora estimada.
- Cada pórtico aplica su horario de tarifa fuera de punta (TBFP), punta (TBP) o saturación (TS) según el tipo de día (laboral, sábado, domingo, festivo).
- Es una estimación: el camino real y el tráfico pueden variar.

## Datos
- `data/tarifas.json`: tarifas vigentes, generadas con `python3 tools/build_tarifas.py`.
- `tools/fuente_*.py`: transcripción de las tablas oficiales de la Dirección General de Concesiones del MOP ([índice](https://concesiones.mop.gob.cl/peajes-y-porticos/)).
- Las tarifas se reajustan cada enero. La app descarga la versión más reciente cuando hay conexión.

## Privacidad
Sin publicidad ni rastreo. Recorridos e historial quedan en el teléfono. Para trazar la ruta, los puntos marcados se envían a los servidores públicos de OpenStreetMap (OSRM y Nominatim).

## Créditos
Mapa © colaboradores de OpenStreetMap. Mapa interactivo: Leaflet. Tarifas: MOP.

Hecho por Orlando Muñoz Cifuentes · [Invítame un café](https://ko-fi.com/omunozcifuentes)
