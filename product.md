## ¿Qué es? 

SUPERION es un copiloto de voz para técnicos de mantenimiento industrial que responde consultas técnicas citando el manual exacto, guía procedimientos paso a paso sin permitir omitir pasos críticos, y registra todo lo que el técnico narra mientras trabaja — para generar automáticamente, al cierre de la intervención, el reporte de mantenimiento y las órdenes de trabajo a partir de la conversación y la evidencia fotográfica. Construido con ElevenLabs Agents, LangGraph, OpenRouter y Supabase, convierte hasta un 50% de jornada perdida en papeleo en tiempo de trabajo real.

## DEMO Objetivo
TODO WEB. 

2 dispositivos, uno móvil y  un dashboard desktop.

### Móvil
- Lista de Ordenes de trabajo en 
- Selecciona Orden de trabajo (tambien se puede hacer por voz)
- Inicia Mantenimiento Preventivo (Se informa por voz y se muestra visual)
- Se muestra el paso actual del procedimiento y el progreso de todo el procedimiento, un cronómetro y tiempo estimado para terminar.
- Durante cada paso, el técnico puede preguntar al asistente sobre cualquier duda relacionada, se responde con base en el manual
- La IA pide tomar fotos en un momento concreto para realizar análisis, si la foto no esta bien pide volver a tomarla. 
- Con la captura de todos estos datos (cercano a tiempo real) se empieza a armar el reporte de mantenimiento en una interfaz visual por separado (Realtime entre dos dispositivos, es decir una parte web en un teléfono móvil y otra en un dashboard donde se va visualizando el reporte)
- Finalmente se genera el documento (.pdf) con el reporte de mantenimiento finalizado y las fotografías registradas.
### Desktop
- Apartado para editar PDFs incluídos en el RAG
- Apartado para ver desarrollo de órdenes de trabajo en curso. 
- Al abrir una orden de trabajo en curso, con la captura de todos los datos descritos en el flujo anterior (cercano a tiempo real) se empieza a armar el reporte de mantenimiento en una interfaz visual atractiva.


## Tecnologías a utilizar

- React19 Typescript para el frontend. Se comunica con Agente de ElevenLabs.
- FastAPI para el backend (API REST)
- LangGraph es dueño del estado y la lógica: la máquina de estados del procedimiento de mantenimiento, el motor RAG, la memoria contextual de la sesión, y el pipeline de generación de reportes/órdenes de trabajo. Se sirve a través de API REST de FastAPI.
- ElevenLabs Agents es dueño del canal de voz: ASR (Scribe), detección de turnos, interrupciones (barge-in) y TTS. Flujo de despliegue con código de Python.
- OpenRouter para todo LLM y embeddings
- Supabase para base de datos, storage y pgvector. 

