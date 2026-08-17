import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const KIMI_URL   = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'
// moonshot-v1-8k narra ("Revisando disponibilidad...") en vez de llamar la
// tool con demasiada frecuencia en pruebas reales -- Moonshot documenta
// kimi-k3 como el modelo confiable para tool calling / multi-step runs.
// Ahora que las tools (agenda + pacientes) están SIEMPRE disponibles, todo
// el tráfico de este endpoint pasa por kimi-k3 -- ver nota de trade-off
// de latencia/costo en memoria del proyecto, aceptada explícitamente por
// Mateo para priorizar arquitectura sobre optimización en esta fase.
const KIMI_MODEL_TOOLS = 'kimi-k3'

// Tool calling nativo real (formato OpenAI-compatible que Kimi soporta de
// verdad, no un JSON inventado por nosotros). Cada tool es una interfaz de
// entrada MÁS a la MISMA función canónica que ya usa la UI manual -- nunca
// una segunda ruta de negocio. Kimi interpreta y decide qué herramienta
// usar; el frontend (Action Engine) es quien las traduce a la función real
// y ejecuta -- Kimi nunca toca Supabase directamente ni inventa resultados.
const APPOINTMENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'buscar_disponibilidad',
      description: 'Consulta la disponibilidad REAL del médico para un día específico. Úsala siempre antes de ofrecer o confirmar cualquier horario -- nunca asumas que algo está libre sin llamarla.',
      parameters: {
        type: 'object',
        required: ['date'],
        properties: {
          date: {
            type: 'string',
            description: 'SOLO la fecha, formato estricto YYYY-MM-DD (ej. "2026-08-18") -- NUNCA incluyas la hora aquí, ni separador "T", eso no va en este campo. Conviértela tú desde lo que dijo el médico (relativo como "mañana"/"el próximo viernes", o absoluto como "el 18 de agosto"), usando facts.today_date como referencia de "hoy". Si el médico ya la dio en un turno anterior de esta misma conversación, reutilízala -- no la vuelvas a pedir.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'crear_cita',
      description: 'Crea la cita real para el paciente ya identificado (con buscar_paciente), en la fecha y hora ya confirmadas como disponibles con buscar_disponibilidad. El sistema SIEMPRE pide aprobación humana antes de escribir nada de verdad -- puedes llamarla en cuanto tengas fecha + hora + disponibilidad confirmada; el médico aprobará o cancelará antes de que se cree realmente. Nunca digas que la cita quedó agendada -- eso lo dice el sistema tras el resultado real.',
      parameters: {
        type: 'object',
        required: ['date', 'time'],
        properties: {
          date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD, la misma que ya se confirmó disponible con buscar_disponibilidad.' },
          time: { type: 'string', description: 'Hora en formato HH:MM de 24 horas, la misma que ya se confirmó disponible.' }
        }
      }
    }
  }
]

// Migración de Pacientes al mismo mecanismo (segundo módulo, después del
// piloto de Agenda). Las 4 funciones canónicas (crearPacienteCore,
// actualizarPacienteCore, archivarPacienteCore, restaurarPacienteCore) NO
// cambian -- estas tools solo las invocan desde una interfaz conversacional
// más. buscar_paciente reemplaza por completo al viejo patient_query para
// TODO lo relacionado a pacientes y agenda -- Kimi ya no depende de que el
// frontend resuelva el nombre por fuera del loop de herramientas.
const PATIENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'buscar_paciente',
      description: 'Busca uno o más pacientes por nombre en la base real de CitaDoc. Úsala SIEMPRE que necesites el id real de un paciente -- antes de actualizar/archivar/restaurar sus datos, o antes de agendarle una cita. Nunca inventes un patient_id: siempre debe venir de un resultado real de esta herramienta (o de facts.patient_context si ya está resuelto en esta conversación).',
      parameters: {
        type: 'object',
        required: ['nombre'],
        properties: {
          nombre: { type: 'string', description: 'Nombre (completo o parcial) tal como lo dijo el médico.' },
          incluir_archivados: { type: 'boolean', description: 'true SOLO si el médico busca a alguien que sospechas archivado (ej. quiere "restaurarlo", dice "lo había eliminado/archivado"). Por defecto false -- busca solo pacientes activos.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'crear_paciente',
      description: 'Crea un paciente NUEVO real. El sistema revisa duplicados reales y SIEMPRE pide aprobación humana (preview) antes de escribir nada -- puedes llamarla en cuanto tengas al menos el nombre.',
      parameters: {
        type: 'object',
        required: ['nombre'],
        properties: {
          nombre: { type: 'string', description: 'Nombre completo, obligatorio -- si el médico no lo dio, pregúntalo, no llames esta tool sin él.' },
          email: { type: 'string', description: 'Email tal como lo dictó el médico, si lo dio. Muy recomendable preguntarlo una vez si falta, pero NO es obligatorio -- el sistema puede crear sin él si el médico no lo tiene.' },
          cedula: { type: 'string', description: 'Cédula/identificación, si la dio. Opcional, no la inventes.' },
          telefono: { type: 'string', description: 'Teléfono, si lo dio. Opcional, no lo inventes.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'actualizar_paciente',
      description: 'Cambia UN dato de un paciente EXISTENTE ya identificado con buscar_paciente. El sistema muestra un Antes -> Después real (con el valor actual de verdad) y pide aprobación humana antes de guardar nada.',
      parameters: {
        type: 'object',
        required: ['patient_id', 'campo', 'valor'],
        properties: {
          patient_id: { type: 'string', description: 'El id REAL del paciente, tal como vino en un resultado de buscar_paciente o en facts.patient_context -- nunca lo inventes.' },
          campo: { type: 'string', enum: ['nombre', 'email', 'cedula', 'telefono', 'fecha_nacimiento', 'genero'], description: 'Cuál dato cambiar. Traduce tú sinónimos: "celular"/"número"->telefono, "correo"->email, "identificación"/"ID"->cedula, "cumpleaños"/"nacimiento"->fecha_nacimiento, "sexo"->genero.' },
          valor: { type: 'string', description: 'El valor nuevo EXACTAMENTE como lo dictó el médico, sin corregirlo ni reformatearlo (ej. si dice "099 888 777" no lo normalices).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'archivar_paciente',
      description: 'Archiva (NUNCA borra) a un paciente EXISTENTE ya identificado con buscar_paciente. "Eliminar" un paciente en CitaDoc SIEMPRE significa esto -- su historial clínico (citas, consultas, recetas) se conserva intacto y es recuperable con restaurar_paciente. El sistema pide aprobación humana antes de ejecutar. Nunca digas que se borró su historial.',
      parameters: {
        type: 'object',
        required: ['patient_id'],
        properties: {
          patient_id: { type: 'string', description: 'El id REAL del paciente, de un resultado de buscar_paciente o facts.patient_context.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'restaurar_paciente',
      description: 'Restaura a un paciente previamente archivado (vuelve a la lista activa, con todo su historial intacto). Para encontrarlo, llama antes buscar_paciente con incluir_archivados:true. El sistema pide aprobación humana antes de ejecutar.',
      parameters: {
        type: 'object',
        required: ['patient_id'],
        properties: {
          patient_id: { type: 'string', description: 'El id REAL del paciente archivado, de un resultado de buscar_paciente.' }
        }
      }
    }
  }
]

// Migración de Documentos/Clínica al mismo mecanismo (tercer módulo,
// después de Pacientes). Las funciones canónicas que ya existían
// (vaChatHandleContent -> medical-soap-extract -> vaValidateMedication ->
// vaChatShowComposeDraft -> vaChatConfirmComposeDraft -> generarYSubirPDF
// -> vaChatConfirmSend -> _vaSendEmailAwait/enviarResumenCompleto) NO
// cambian -- estas tools solo las invocan desde una interfaz conversacional
// más. La resolución de discrepancias de medicamento (catálogo/
// concentración) sigue siendo 100% por botones en el chat, NUNCA decidida
// por Kimi -- decisión de seguridad clínica explícita, no una limitación
// técnica. resumen_clinico reemplaza a la vieja acción clásica
// "clinical.summary" (solo lectura); reenviar un documento YA EXISTENTE
// sigue siendo el flujo clásico doc_types/source:'existing' (sin tocar,
// no estaba en el alcance de esta migración).
const DOCUMENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'resumen_clinico',
      description: 'Consulta qué tiene registrado un paciente en su última consulta real (motivo, diagnóstico, plan) -- SOLO lectura, no crea ni modifica nada. Requiere un paciente ya identificado con buscar_paciente. Nunca la confundas con reenviar el resumen clínico como documento (eso es distinto, ver doc_types/source más abajo).',
      parameters: {
        type: 'object',
        required: ['patient_id'],
        properties: {
          patient_id: { type: 'string', description: 'El id REAL del paciente, de un resultado de buscar_paciente o de facts.patient_context -- nunca lo inventes.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'crear_receta',
      description: 'Estructura y muestra en el chat el borrador EDITABLE de una receta NUEVA, a partir de lo que el médico dictó (medicamento(s), dosis, frecuencia, duración). El sistema valida cada medicamento/concentración contra el catálogo real de CitaDoc -- si algo no coincide, pausa y le pregunta al médico antes de seguir (nunca corrige ni asume solo). No genera el PDF todavía -- eso ocurre solo con la tool generar_pdf, después de que el médico aprueba el borrador. Si el mismo dictado también menciona laboratorio o estudios de imagen, no llames otra tool aparte -- el sistema detecta e incluye automáticamente todos los tipos presentes en el texto.',
      parameters: {
        type: 'object',
        required: ['patient_id', 'contenido'],
        properties: {
          patient_id: { type: 'string', description: 'El id REAL del paciente, de un resultado de buscar_paciente o de facts.patient_context -- nunca lo inventes.' },
          contenido: { type: 'string', description: 'Lo que dictó el médico tal cual, completo y sin resumir (medicamento, dosis, frecuencia, duración, y cualquier examen o estudio mencionado en la misma frase).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'crear_orden_laboratorio',
      description: 'Estructura y muestra en el chat el borrador EDITABLE de una orden de laboratorio NUEVA (exámenes de sangre/orina/heces: glucemia, hemograma, TSH, creatinina, etc.), a partir de lo que el médico dictó. No genera el PDF todavía -- eso ocurre solo con la tool generar_pdf, después de que el médico aprueba el borrador. Si el mismo dictado también menciona medicamentos o estudios de imagen, no llames otra tool aparte -- el sistema detecta e incluye automáticamente todos los tipos presentes en el texto.',
      parameters: {
        type: 'object',
        required: ['patient_id', 'contenido'],
        properties: {
          patient_id: { type: 'string', description: 'El id REAL del paciente, de un resultado de buscar_paciente o de facts.patient_context -- nunca lo inventes.' },
          contenido: { type: 'string', description: 'Lo que dictó el médico tal cual, completo y sin resumir (qué exámenes, y cualquier medicamento o estudio de imagen mencionado en la misma frase).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'crear_orden_imagenes',
      description: 'Estructura y muestra en el chat el borrador EDITABLE de una orden de estudios de imagen NUEVA (radiografía, ecografía, TAC, RMN, mamografía -- cualquier estudio que produzca una imagen del cuerpo, nunca exámenes de sangre/orina), a partir de lo que el médico dictó. No genera el PDF todavía -- eso ocurre solo con la tool generar_pdf, después de que el médico aprueba el borrador. Si el mismo dictado también menciona medicamentos o laboratorio, no llames otra tool aparte -- el sistema detecta e incluye automáticamente todos los tipos presentes en el texto.',
      parameters: {
        type: 'object',
        required: ['patient_id', 'contenido'],
        properties: {
          patient_id: { type: 'string', description: 'El id REAL del paciente, de un resultado de buscar_paciente o de facts.patient_context -- nunca lo inventes.' },
          contenido: { type: 'string', description: 'Lo que dictó el médico tal cual, completo y sin resumir (qué estudio(s), y cualquier medicamento o examen de laboratorio mencionado en la misma frase).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generar_pdf',
      description: 'Aprueba el borrador de documento(s) que ya se mostró en el chat (receta/laboratorio/imágenes) y genera el/los PDF(s) REALES. Llama esto SOLO cuando el médico ya vio el borrador editable Y dio su aprobación explícita en palabras (ej. "sí", "confirma", "genérala", "está bien así") -- nunca la llames justo después de mostrar el borrador sin que el médico haya respondido, ni si hay una discrepancia de medicamento sin resolver todavía (esa se resuelve con botones en el chat, espera a que termine). En cuanto el médico apruebe, LLAMA esta tool DE VERDAD en ese mismo turno -- nunca respondas solo en texto diciendo que ya lo generas o que ya lo haces, eso es narrar sin ejecutar. No lleva argumentos.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'enviar_documento',
      description: 'Firma y envía DE VERDAD el/los documento(s) cuyo PDF ya se generó y se mostró en el chat, al email real del paciente. Llama esto SOLO cuando el médico ya vio el/los PDF(s) Y dio su aprobación explícita para enviarlos (ej. "sí, envíalo", "mándaselo", "firma y envía"). En cuanto el médico apruebe, LLAMA esta tool DE VERDAD en ese mismo turno -- nunca respondas solo en texto diciendo que ya lo envías o que ya lo haces, eso es narrar sin ejecutar. Nunca digas que se envió algo -- eso lo dice el sistema con el resultado real de esta tool (puede fallar de verdad). No lleva argumentos.',
      parameters: { type: 'object', properties: {} }
    }
  }
]

const ALL_TOOLS = [...APPOINTMENT_TOOLS, ...PATIENT_TOOLS, ...DOCUMENT_TOOLS]

// Kimi SOLO conversa y decide qué herramienta usar; nunca ejecuta nada ni
// escribe en Supabase directamente -- eso lo hace el frontend (Action
// Engine) llamando SIEMPRE a la misma función canónica que usa la UI
// manual. Dos capas conviven a propósito en este esquema:
// - doc_types/source/directive: SOLO para reenviar un documento clínico YA
//   EXISTENTE (source:'existing') -- se deja intacto, sin tocar, no era
//   parte de esta migración. Crear contenido nuevo ahora SIEMPRE pasa por
//   las tools de documentos (ver arriba).
// - action/entities: lo que queda del Action Engine clásico (Fase 1) para
//   las acciones de lectura AÚN no migradas a tools: appointments.list,
//   appointments.next, dashboard.query. Pacientes, Agenda y Documentos/
//   Clínica YA NO pasan por acá -- son tools reales (ver arriba).
const SYSTEM_PROMPT = `Eres el asistente conversacional de CitaDoc, dentro del dashboard de un médico.
Hablas español latinoamericano, tono profesional y cálido, respuestas CORTAS (1-2 frases,
como un chat real, nunca un párrafo largo).

Tienes herramientas reales (tool calling) SIEMPRE disponibles para pacientes, agenda
y documentos/clínica -- ver "HERRAMIENTAS DE PACIENTES", "HERRAMIENTAS PARA AGENDAR
CITAS" y "HERRAMIENTAS DE DOCUMENTOS/CLÍNICA" más abajo. Para todo lo demás, llenas
estos campos de un JSON de clasificación:

- action: una de estas claves, o null si el mensaje es sobre documentos clínicos
  (recetas/laboratorios/imágenes/resumen -- ver HERRAMIENTAS DE DOCUMENTOS/CLÍNICA)
  o no tiene que ver con ninguna acción:
  - "appointments.list": qué citas/pacientes tiene en un día o rango ("mañana",
    "esta semana", "hoy", "el lunes"...)
  - "appointments.next": cuál es su próxima cita (sin especificar paciente)
  - "dashboard.query": estadísticas del médico (cuántos pacientes/citas hoy,
    esta semana, este mes, o total de pacientes)
- entities: objeto con SOLO lo que aplique a la acción:
  - date_range: fecha o rango tal como lo dijo el médico ("mañana", "esta
    semana", "el viernes") -- texto crudo, el sistema lo interpreta.
  - metric: qué estadística pidió, tal como la dijo ("hoy", "esta semana",
    "este mes", "total de pacientes") -- texto crudo.
- patient_query: el nombre de un paciente que YA EXISTE, SOLO relevante para
  REENVIAR un documento clínico YA EXISTENTE (source:"existing", identificar
  de quién se habla). Para TODO lo demás relacionado a pacientes -- incluido
  crear un documento nuevo o consultar qué tiene registrado -- usa la
  herramienta buscar_paciente, nunca este campo. Si claramente sigue
  hablando del mismo paciente de un turno anterior, deja patient_query en
  "" -- el sistema ya recuerda de quién se habla.
- doc_types, source, directive: SOLO se usan para REENVIAR un documento
  clínico YA EXISTENTE de la última consulta (ej. "envíale de nuevo la
  receta a Juan", "firma y envía el resumen a Ana"). Para CREAR un
  documento nuevo (dictar una receta/orden nueva) o para consultar qué
  tiene registrado un paciente, usa SIEMPRE las herramientas de
  documentos/clínica -- nunca estos campos. Si "action" no es null, deja
  doc_types:[] y source:null.
  - doc_types: array con una o más de "receta" | "laboratorio" | "imagenes" |
    "resumen". "laboratorio" = SOLO exámenes de sangre/orina/heces (glucemia,
    urea, creatinina, hemograma, TSH, etc.). "imagenes" = CUALQUIER estudio que
    produzca una imagen del cuerpo (RX, eco, TAC, RMN, mamografía) -- nunca
    "laboratorio", aunque se mencionen juntos.
  - source: "existing" (reenviar documento(s) YA existentes) | null. Nunca
    uses "new" -- para contenido nuevo, usa las herramientas de documentos.
  - directive: true SOLO si el médico dio una orden imperativa completa y
    explícita en la MISMA frase (ej. "firma y envía la receta a Juan"). Solo
    aplica quando source="existing".

Recibes un bloque "HECHOS CONOCIDOS" con lo que el sistema ya verificó (si el
paciente existe, si ya hay documentos guardados, "has_pending_action" si hay un
PDF esperando confirmación, "patient_context" si ya hay un paciente real
resuelto en esta conversación -- por buscar_paciente o por un turno anterior
-- y "patient_name" equivalente para el flujo clásico de reenvío de
documentos existentes). Úsalo para conversar con naturalidad:

- Si "action" necesita un dato que falta (ej. appointments.list sin fecha
  clara), pregúntalo de forma breve y natural -- nunca lo inventes.
- Si "patient_context" o "patient_name" ya tiene a alguien y el mensaje no
  menciona a nadie más, asume que se sigue hablando de esa persona -- no
  vuelvas a llamar buscar_paciente para el mismo paciente en la misma
  conversación, reutiliza su id.
- Nunca digas que ya ejecutaste una acción, que consultaste algo, o cuál fue el
  resultado -- tú no tienes esa información. El sistema (no tú) consulta los
  datos reales y te los pasa como hecho en el próximo turno a través de
  "last_action_summary", o como resultado real de una tool. Tu reply para un
  turno con "action" definida y datos completos debe ser breve, tipo "Reviso
  ahora." o "Voy a ver eso.", nunca una respuesta inventada con datos.
- Para reenviar documentos existentes: en cuanto doc_types y source ya estén
  claros y "patient_resolved" sea true, NO preguntes "¿quieres que los
  prepare?" -- el sistema ya actúa solo. Si "has_pending_action" es true, no
  vuelvas a preguntar por doc_types/source.
- Si source="existing" pero no hay documento guardado de algún tipo pedido,
  avísale y pregunta si quiere crear uno nuevo -- eso ya no es doc_types/
  source, es una llamada normal a crear_receta/crear_orden_laboratorio/
  crear_orden_imagenes con lo que dicte.

REGLA DURA #1 — NUNCA la rompas: si no hay un paciente real resuelto
("patient_context" o "patient_resolved"/"patient_name" según el caso), NO
tienes autoridad para hablar de contenido específico de un paciente (recetas,
dosis, citas, resumen clínico, datos personales), aunque el médico ya lo haya
mencionado en el chat. Resuélvelo primero con buscar_paciente (o, para
reenviar un documento existente, pidiendo el nombre). El sistema verifica la
existencia del paciente por código, nunca por lo que tú digas.

REGLA DURA #2 — sobre "last_action_summary": si los HECHOS CONOCIDOS traen
"last_action_summary" y el médico pregunta por un resultado anterior, tu "reply"
debe basarse EXCLUSIVAMENTE en ese texto. NUNCA inventes una explicación propia.

REGLA DURA #3 — NUNCA le pidas al médico que confirme algo que el sistema ya va a
hacer solo (las tools mutativas ya disparan su propia confirmación real en la
interfaz), ni dejes una acción "descrita" sin ejecutar cuando ya tienes todo lo
necesario. Si tienes los datos, actúa (llama la tool); si falta algo, pregúntalo.

HERRAMIENTAS DE PACIENTES (buscar_paciente, crear_paciente, actualizar_paciente,
archivar_paciente, restaurar_paciente) -- SIEMPRE disponibles:
- Cualquier mención a un paciente EXISTENTE (buscarlo, abrir su info, cambiar
  un dato, eliminarlo/archivarlo, restaurarlo, o agendarle una cita) empieza
  por buscar_paciente si todavía no tienes su id real (ni en facts.patient_context
  ni en el historial de esta conversación).
- Si buscar_paciente devuelve varios candidatos, descríbelos brevemente
  (nombre + edad o cédula si vienen) y pregunta cuál -- nunca asumas uno.
- Si buscar_paciente no encuentra a nadie, dilo y pregunta si el médico quiere
  crear un paciente nuevo con ese nombre -- nunca asumas que existe.
- crear_paciente: llama en cuanto tengas el nombre. Si falta el email,
  pregúntalo UNA vez ("¿tienes su correo? si no, lo creo igual"), pero si el
  médico no lo da, llama la tool igual sin insistir -- el sistema puede crear
  sin él.
- actualizar_paciente / archivar_paciente / restaurar_paciente: SIEMPRE
  necesitan un patient_id real -- nunca los llames sin haber resuelto al
  paciente primero con buscar_paciente (o tenerlo ya en patient_context).
- "Eliminar" un paciente = archivar_paciente, nunca implica borrado real.

HERRAMIENTAS PARA AGENDAR CITAS (buscar_disponibilidad, crear_cita) -- SIEMPRE
disponibles, pero requieren un paciente YA identificado (con buscar_paciente
o facts.patient_context) antes de usarlas:
- Extrae fecha y hora de TODA la conversación, no solo del último mensaje --
  si el médico ya te dio la fecha en un turno anterior y ahora solo te da la
  hora (o viceversa), ya la tienes, nunca la vuelvas a pedir.
- Si falta la fecha O la hora, no llames ninguna herramienta -- responde en
  TEXTO PLANO (no JSON) preguntando ÚNICAMENTE el dato que falta.
- Si tienes fecha y hora, LLAMA buscar_disponibilidad EN ESTE MISMO turno --
  nunca respondas en texto plano diciendo que vas a revisar, que estás
  comprobando, o cualquier frase que describa la acción sin ejecutarla. O
  llamas la herramienta ahora, o preguntas lo que falta -- nunca narres una
  acción que no estás ejecutando de verdad.
- Si el horario pedido aparece en los slots que te devuelve, llama crear_cita
  con esa fecha y hora -- el sistema le pedirá aprobación al médico antes de
  escribir nada de verdad, tú no necesitas pedir confirmación en texto.
- Si el horario pedido NO aparece disponible, nunca llames crear_cita --
  respóndele en texto plano que ese horario no está disponible y ofrécele 2-3
  alternativas REALES tomadas del resultado de buscar_disponibilidad, nunca
  inventadas.
- Si crear_cita devuelve ok:false (alguien más tomó el horario justo antes),
  nunca digas que la cita quedó creada -- avísale en texto plano y ofrece las
  alternativas reales que vengan en ese resultado.
- Nunca digas que una cita quedó agendada a menos que el resultado real de
  crear_cita diga ok:true.

HERRAMIENTAS DE DOCUMENTOS/CLÍNICA (resumen_clinico, crear_receta,
crear_orden_laboratorio, crear_orden_imagenes, generar_pdf,
enviar_documento) -- SIEMPRE disponibles. Las primeras cuatro requieren un
paciente YA identificado (con buscar_paciente o facts.patient_context)
antes de usarlas; generar_pdf/enviar_documento actúan sobre lo que ya está
en curso en el chat y no llevan patient_id:
- Nunca llames ninguna de estas cuatro en el MISMO turno en que llamas
  buscar_paciente si el paciente todavía no está resuelto -- espera al
  resultado real de buscar_paciente (turno separado), a menos que
  patient_context ya tenga su id.
- "¿Qué tiene registrado Fulano?" / "resume su última consulta" ->
  resumen_clinico. Es de SOLO LECTURA -- nunca la confundas con reenviar un
  documento (eso sigue siendo doc_types:["resumen"], source:"existing", ver
  REGLAS).
- Dictado de una receta/examen/estudio NUEVO ("dale ibuprofeno 600mg a
  Juan", "pídele una glucemia a Ana", "una radiografía de tórax para
  Mateo") -> crear_receta / crear_orden_laboratorio / crear_orden_imagenes
  según corresponda, con el patient_id y el texto COMPLETO tal como lo
  dictó el médico. Si el dictado mezcla varios tipos en la misma frase (ej.
  receta + imagen), llama SOLO UNA de estas tres tools con el texto
  completo -- el sistema detecta e incluye automáticamente todos los tipos
  presentes, nunca llames más de una para el mismo dictado.
- El sistema muestra el borrador EDITABLE en el chat (y, si algún
  medicamento no coincide con el catálogo, pausa con botones para que el
  médico decida -- nunca sigas ni asumas una alternativa tú, eso NUNCA es
  tu decisión). Tu reply para el turno en que llamaste una de estas tres
  tools debe ser breve ("Aquí está el borrador, revísalo." o similar) --
  nunca describas contenido específico del documento, eso ya lo ve el
  médico en el chat.
- Si YA llamaste crear_receta/crear_orden_laboratorio/crear_orden_imagenes
  en este mismo tema y el borrador YA está mostrado, NUNCA vuelvas a
  llamar esa misma tool para el mismo contenido -- eso solo re-extrae lo
  mismo y no avanza nada. Si el médico dice que sigue adelante ("sí",
  "genérala", "está bien así"), la ÚNICA tool correcta en ese momento es
  generar_pdf -- nunca repitas la extracción pensando que eso es "generar".
- generar_pdf: SOLO cuando el médico ya vio el borrador y aprobó
  explícitamente en palabras ("sí", "confirma", "genérala", "está bien
  así"). Si ya aprobó, LLAMA la tool EN ESTE MISMO turno -- nunca respondas
  en texto plano diciendo que ya la generas, que ya la vas a hacer, o
  cualquier frase que describa la acción sin ejecutarla de verdad. O
  llamas la tool ahora, o (si todavía no aprobó) le devuelves el borrador
  a su consideración en texto -- nunca narres una acción que no estás
  ejecutando. Genera el PDF real y lo muestra en una tarjeta -- nunca
  digas TÚ que el documento quedó generado, eso lo dice el sistema con el
  resultado real.
- enviar_documento: SOLO cuando el médico ya vio el PDF y aprobó
  explícitamente enviarlo ("sí, envíalo", "mándaselo", "firma y envía"). Si
  ya aprobó, LLAMA la tool EN ESTE MISMO turno -- misma regla que
  generar_pdf, nunca narres el envío sin ejecutarlo. Nunca digas que se
  envió algo -- eso lo dice el sistema con el resultado real (puede fallar
  de verdad, ej. sin email registrado o error del servidor de correo).

REGLAS:
- Si el tema es sobre pacientes, agenda, o documentos/clínica que el médico
  está creando o consultando AHORA, usa las herramientas correspondientes o
  responde en texto plano -- NUNCA el JSON de clasificación para esos
  temas.
- Para REENVIAR un documento clínico YA EXISTENTE y para appointments.list/
  next/dashboard.query, responde SOLO JSON válido, sin markdown, sin
  explicaciones fuera del JSON. Esto aplica siempre, incluso cuando el
  mensaje es ambiguo o falta información -- responde igual el JSON con
  "reply" preguntando lo que falta.
- No inventes un paciente, una cita, ni un dato que no esté en la conversación,
  en los HECHOS CONOCIDOS, o en un resultado real de una herramienta.

EJEMPLOS:
- "¿Cuál es mi próxima cita?" -> {"reply":"Reviso tu agenda.","action":"appointments.next","entities":{},"patient_query":"","doc_types":[],"source":null,"directive":false}
- "Muéstrame mis pacientes de mañana" -> {"reply":"Reviso tu agenda de mañana.","action":"appointments.list","entities":{"date_range":"mañana"},"patient_query":"","doc_types":[],"source":null,"directive":false}
- "¿Cuántos pacientes atendí hoy?" -> {"reply":"Reviso tus estadísticas.","action":"dashboard.query","entities":{"metric":"pacientes hoy"},"patient_query":"","doc_types":[],"source":null,"directive":false}
- "Firma y envía la receta a Mateo Alarcón" (documento YA existente) -> {"reply":"Encontré a Mateo Alarcón, reviso la receta.","action":null,"entities":{},"doc_types":["receta"],"source":"existing","patient_query":"Mateo Alarcón","directive":true}
- "Busca a Mateo Alarcón" -> llama buscar_paciente({"nombre":"Mateo Alarcón"}), NUNCA el JSON de arriba.
- "Cámbiale el teléfono a Mateo, ahora es 099 888 7777" (sin patient_context) -> llama buscar_paciente({"nombre":"Mateo"}) primero; cuando tengas su id, llama actualizar_paciente({"patient_id":"...","campo":"telefono","valor":"099 888 7777"}).
- "Crea al paciente Juan Pérez con cédula 0999999 y email juanperez@gmail.com" -> llama crear_paciente({"nombre":"Juan Pérez","cedula":"0999999","email":"juanperez@gmail.com"}).
- "Elimina al paciente Juan Pérez" -> buscar_paciente({"nombre":"Juan Pérez"}) -> archivar_paciente({"patient_id":"..."}).
- "Restaura a Ana Torres, la había archivado" -> buscar_paciente({"nombre":"Ana Torres","incluir_archivados":true}) -> restaurar_paciente({"patient_id":"..."}).
- "¿Qué tiene registrado Mateo?" (sin patient_context) -> buscar_paciente({"nombre":"Mateo"}) primero; cuando tengas su id, llama resumen_clinico({"patient_id":"..."}), NUNCA action:"clinical.summary" (ya no existe).
- "Ibuprofeno 600mg cada 12 horas por 7 días a Mateo" (con Mateo ya en patient_context) -> llama crear_receta({"patient_id":"...","contenido":"Ibuprofeno 600mg cada 12 horas por 7 días"}), NUNCA el JSON de arriba.
- "Sí, genérala" (con un borrador de receta/laboratorio/imágenes ya mostrado en el chat) -> llama generar_pdf({}).
- "Mándasela" (con el PDF ya mostrado en una tarjeta) -> llama enviar_documento({}).

ESQUEMA DE RESPUESTA (solo para los temas que aún no son tools):
{
  "reply": "",
  "action": null,
  "entities": {},
  "patient_query": "",
  "doc_types": [],
  "source": null,
  "directive": false
}`

const VALID_ACTIONS = new Set([
  'appointments.list',
  'appointments.next',
  'dashboard.query'
])

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const t0 = Date.now()

  try {
    const { messages, facts, medico_id, tool_history } = await req.json()
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rl = await checkRateLimit('voice_assistant_chat', medico_id || null, ip)
    if (!rl.allowed) {
      return Response.json({ ok: false, error: rl.reason, retry_after: 60 }, { headers: cors, status: 429 })
    }
    if (!Array.isArray(messages) || !messages.length) {
      return Response.json({ ok: false, error: 'messages required' }, { headers: cors, status: 400 })
    }

    const apiKey = Deno.env.get('KIMI_API_KEY')
    if (!apiKey) return Response.json({ ok: false, error: 'KIMI_API_KEY not set' }, { headers: cors, status: 500 })

    const factsBlock = `\n\nHECHOS CONOCIDOS (verificados por el sistema, no los inventes ni los contradigas):\n${JSON.stringify(facts || {}, null, 0)}`

    const kimiMessages: Record<string, unknown>[] = [
      { role: 'system', content: SYSTEM_PROMPT + factsBlock },
      ...messages.slice(-12).map((m: { role: string; text: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.text || '').slice(0, 1000)
      }))
    ]
    // Continuación de un loop de tool calling ya en curso (el frontend ya
    // ejecutó uno o más tool_calls y manda de vuelta el mensaje del
    // assistant + los resultados role:"tool", en formato crudo OpenAI) --
    // se agregan tal cual, después del historial normal, para que Kimi
    // siga exactamente esa misma conversación de herramientas.
    if (Array.isArray(tool_history) && tool_history.length) {
      kimiMessages.push(...tool_history)
    }

    // Pacientes + Agenda + Documentos/Clínica: tools SIEMPRE disponibles
    // (ya no dependen de patient_context como en el piloto de Agenda --
    // buscar_paciente es ahora la forma en que Kimi resuelve identidad, no
    // un pre-requisito externo). Para todo lo demás (appointments.list/
    // next, dashboard.query, y reenviar un documento YA existente) Kimi
    // sigue respondiendo el JSON de clasificación de siempre -- se detecta
    // abajo intentando parsearlo cuando no hay tool_calls.
    const kimiBody: Record<string, unknown> = {
      model: KIMI_MODEL_TOOLS, temperature: 1, messages: kimiMessages,
      tools: ALL_TOOLS, tool_choice: 'auto'
    }

    const kimiRes = await fetch(KIMI_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(kimiBody)
    })

    const latency = Date.now() - t0

    if (!kimiRes.ok) {
      const err = await kimiRes.text()
      return Response.json({ ok: false, error: 'Kimi error: ' + err.slice(0, 200) }, { headers: cors, status: 500 })
    }

    const kimiData    = await kimiRes.json()
    const kimiChoice   = kimiData.choices?.[0]
    const kimiMessage  = kimiChoice?.message || {}
    const finishReason = kimiChoice?.finish_reason
    const content       = kimiMessage.content || ''
    const usage         = kimiData.usage || {}

    const logUsage = async () => {
      try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        await supabase.from('ai_usage_logs').insert({
          doctor_id: medico_id || null, feature: 'voice_assistant_chat', model: KIMI_MODEL_TOOLS,
          input_tokens: usage.prompt_tokens || 0, output_tokens: usage.completion_tokens || 0,
          pricing_version: '2026-05', latency_ms: latency, success: true
        })
      } catch (_) { /* non-blocking */ }
    }

    if (finishReason === 'tool_calls' && Array.isArray(kimiMessage.tool_calls) && kimiMessage.tool_calls.length) {
      await logUsage()
      console.log('[voice-assistant-chat][TOOLS] tool_calls:', kimiMessage.tool_calls.map((tc: { function?: { name?: string } }) => tc.function?.name))
      return Response.json({
        ok: true,
        mode: 'tool_calls',
        tool_calls: kimiMessage.tool_calls.map((tc: { id: string; function?: { name?: string; arguments?: string } }) => ({
          id: tc.id,
          name: tc.function?.name,
          arguments: tc.function?.arguments || '{}'
        })),
        assistant_message: kimiMessage,
        latency_ms: latency
      }, { headers: cors })
    }

    // Sin tool_calls: puede ser (a) el JSON de clasificación clásico, para
    // los temas que aún no son tools, o (b) una respuesta conversacional en
    // texto plano dentro de un intercambio de herramientas (ej. "¿qué día
    // quieres agendar?"). Se intenta parsear como el JSON clásico primero;
    // si genuinamente no lo es, se trata como texto plano.
    let cleaned = content.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    }
    let turn: {
      reply?: string; action?: string; entities?: Record<string, unknown>;
      doc_types?: unknown; source?: string; patient_query?: string; directive?: boolean
    } | null = null
    const looksLikeJson = cleaned.startsWith('{')
    if (looksLikeJson) {
      try { turn = JSON.parse(cleaned) } catch { /* no era JSON válido */ }
      if (!turn) {
        const match = cleaned.match(/\{[\s\S]+\}/)
        if (match) { try { turn = JSON.parse(match[0]) } catch { /* sigue abajo */ } }
      }
    }

    // Si Kimi CLARAMENTE intentó responder JSON (empieza con "{") pero
    // quedó roto incluso con el intento de recuperación, esto NUNCA debe
    // mostrarse como si fuera una respuesta de texto plano válida -- es el
    // mismo caso de "JSON parse failed" de siempre, con el mismo error
    // recuperable y explícito de antes.
    if (looksLikeJson && !turn) {
      console.error('[voice-assistant-chat] JSON parse failed, sin recuperación posible. raw:', content.slice(0, 800))
      return Response.json({ ok: false, error: 'No pude interpretar la respuesta, intenta de nuevo.', raw: content.slice(0, 500) }, { headers: cors })
    }

    if (!turn || typeof turn.action === 'undefined') {
      // Texto plano genuino -- continuación conversacional de un intercambio
      // de herramientas (pacientes o agenda), no el clasificador clásico.
      await logUsage()
      console.log('[voice-assistant-chat][TOOLS] respuesta en texto plano (sin tool_calls):', content.slice(0, 200))
      return Response.json({ ok: true, mode: 'text', reply: content || '¿Puedes repetir eso?', latency_ms: latency }, { headers: cors })
    }

    const VALID_DOC_TYPES = ['receta', 'laboratorio', 'imagenes', 'resumen']
    const rawTypes = Array.isArray(turn.doc_types) ? turn.doc_types : []
    const seen = new Set<string>()
    const docTypes = rawTypes.filter((t: unknown): t is string => {
      if (typeof t !== 'string' || !VALID_DOC_TYPES.includes(t) || seen.has(t)) return false
      seen.add(t)
      return true
    })
    const source = ['existing', 'new'].includes(String(turn.source)) ? turn.source : null
    const action = VALID_ACTIONS.has(String(turn.action)) ? turn.action : null
    const entities = (turn.entities && typeof turn.entities === 'object') ? turn.entities : {}

    await logUsage()

    return Response.json({
      ok: true,
      reply: turn.reply || '¿Puedes repetir eso?',
      action,
      entities,
      doc_types: docTypes,
      source: source,
      patient_query: turn.patient_query || '',
      directive: turn.directive === true,
      latency_ms: latency
    }, { headers: cors })

  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { headers: cors, status: 500 })
  }
})
