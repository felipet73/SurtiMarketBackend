# Modulo challenges

## Proposito

Gestiona retos y quiz semanal con IA/gamificacion:

- listado de retos activos
- reto semanal por usuario
- quiz semanal generado por plantilla (`ChallengeTemplate`)
- submit del quiz semanal con scoring, ecoCoins y puntos de grupo

## Seguridad / Auth

- `GET /challenges`: publico
- Resto de endpoints: `JwtAuthGuard`

## DTOs

### `SubmitWeeklyQuizDto`
- `answers: number[]`
- reglas:
  - arreglo requerido
  - enteros
  - cada item entre `0` y `3`
  - longitud exacta = numero de preguntas del quiz

## Dependencias funcionales importantes

- `ChallengeTemplate` (plantillas configurables por dimension y tipo QUIZ/WEEKLY)
- `ChallengeInstance` (instancia semanal generada)
- `QuizSubmission` (intentos por usuario + idempotencia)
- `WalletService` (ecoCoins)
- `SustainabilityService` (mejora de perfil)
- `GroupProgressService` (puntos grupales por quiz/quiz_repeat)

## Endpoints

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| GET | `/challenges` | No | Lista retos activos |
| POST | `/challenges/:id/complete` | JWT | Completa reto individual/grupal |
| GET | `/challenges/weekly/me` | JWT | Obtiene reto semanal tradicional |
| GET | `/challenges/weekly-quiz/me` | JWT | Obtiene/genera quiz semanal del usuario |
| POST | `/challenges/weekly-quiz/:instanceId/submit` | JWT | Envía respuestas del quiz semanal |

---

## Ejemplos reales completos

### 1) Obtener quiz semanal del usuario

### Request
```http
GET /challenges/weekly-quiz/me
Authorization: Bearer <TOKEN>
```

### Response (ejemplo)
```json
{
  "focusDimension": "water",
  "focusScore": 4,
  "submissionStatus": {
    "hasSubmitted": false,
    "passed": false,
    "scorePercent": null,
    "correctCount": null,
    "rewardGranted": false,
    "ecoCoinsGranted": 0
  },
  "instance": {
    "id": "698967420db350791a334612",
    "weekKey": "2026-W07",
    "templateKey": "WEEKLY_QUIZ_WATER_V1",
    "focusDimension": "water",
    "rewardEcoCoins": 30,
    "cardImage": {
      "mimeType": "image/png",
      "base64": "iVBORw0KGgoAAAANSUhEUgAA..."
    },
    "payload": {
      "title": "Desafío Semanal: Cuida el Agua en Casa",
      "description": "Aprende a reducir tu consumo de agua con hábitos simples...",
      "ecoCoinsReward": 30,
      "questions": [
        {
          "question": "¿Qué acción ahorra más agua al cepillarte?",
          "options": [
            "Dejar correr el agua",
            "Usar un vaso",
            "Abrir más la llave",
            "Cepillarte más rápido"
          ],
          "answerIndex": 1,
          "explanation": "Usar un vaso evita dejar correr el agua innecesariamente."
        }
      ]
    }
  }
}
```

### Error de plantilla faltante (muy común en ambiente nuevo)
```json
{
  "message": "No hay ChallengeTemplate QUIZ WEEKLY para waste",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### 2) Enviar respuestas del quiz semanal

### Request
```http
POST /challenges/weekly-quiz/698967420db350791a334612/submit
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

```json
{
  "answers": [1, 0, 2, 3, 1]
}
```

### Response (aprobado, primer intento)
```json
{
  "idempotent": false,
  "passed": true,
  "correctCount": 5,
  "totalQuestions": 5,
  "scorePercent": 100,
  "ecoCoinsGranted": 30,
  "rewardGranted": true,
  "ecoCoinsBalance": 70,
  "profileUpdate": {
    "changed": true,
    "overallScore": 5,
    "dimensionScores": {
      "waste": 5,
      "transport": 5,
      "energy": 6,
      "water": 5,
      "consumption": 4
    },
    "improvedDimension": "water",
    "from": 4,
    "to": 5,
    "reasonRefId": "698967420db350791a334612"
  }
}
```

### Response (reenvío del mismo quiz ya aprobado)
```json
{
  "idempotent": true,
  "passed": true,
  "correctCount": 5,
  "totalQuestions": 5,
  "scorePercent": 100,
  "ecoCoinsGranted": 30,
  "rewardGranted": true
}
```

Notas:
- El módulo puede sumar puntos de grupo por `QUIZ_REPEAT` (+2) en reenvíos si ya estaba aprobado.
- La recompensa en ecoCoins no se duplica por `rewardGranted` + ledger idempotente.

### Response (reprobado)
```json
{
  "idempotent": false,
  "passed": false,
  "correctCount": 2,
  "totalQuestions": 5,
  "scorePercent": 40,
  "ecoCoinsGranted": 0,
  "rewardGranted": false
}
```

### Errores frecuentes
- `400`: `answers` con longitud incorrecta
- `404`: `ChallengeInstance no existe`
- `400`: `Instance sin preguntas`

---

### 3) Obtener reto semanal (no quiz)

### Request
```http
GET /challenges/weekly/me
Authorization: Bearer <TOKEN>
```

### Response (ejemplo)
```json
{
  "weekKey": "2026-W07",
  "focusDimension": "waste",
  "focusScore": 3,
  "challenge": {
    "_id": "698960000db350791a330001",
    "title": "Separa residuos reciclables en casa",
    "description": "Clasifica plástico, papel y orgánicos durante 3 días.",
    "type": "WEEKLY",
    "focusDimension": "waste",
    "rewardEcoCoins": 25,
    "isActive": true
  }
}
```

## Decisiones de implementacion

- `GET /weekly-quiz/me` genera la instancia bajo demanda usando `QuizGeneratorService` (lazy-init).
- `QuizSubmission` usa idempotencia por `userId + instanceId`.
- Recompensa de ecoCoins se toma de `instance.payload.ecoCoinsReward` y cae a `template.rewardEcoCoins` si falta.

## Pendientes / Operacion

- Sembrar `ChallengeTemplate` inicial por las 5 dimensiones (`waste`, `transport`, `energy`, `water`, `consumption`) en ambientes nuevos.
- Añadir endpoint admin para crear plantillas (actualmente hay listar/editar/activar en admin prompts, no crear).

